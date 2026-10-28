const express = require("express");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { User, Employee, Leave, Attendance, Task } = require("./models");
const { auth, allowRoles } = require("./middleware/auth");
const router = express.Router();

const asyncRoute = fn => (req, res, next) => Promise.resolve(fn(req, res, next)).catch(next);
const cleanUser = u => ({ id: u._id, name: u.name, email: u.email, role: u.role, department: u.department, jobTitle: u.jobTitle });

router.post("/auth/register", asyncRoute(async (req, res) => {
  const { name, email, password, role } = req.body;
  if (!name || !email || !password || password.length < 8)
    return res.status(400).json({ message: "Name, email and a password of at least 8 characters are required" });
  if (await User.exists({ email: email.toLowerCase() }))
    return res.status(409).json({ message: "An account with this email already exists" });
  // Public registration always creates an employee; provision admin accounts securely out-of-band.
  const user = await User.create({ name, email, passwordHash: await bcrypt.hash(password, 12), role: "employee" });
  res.status(201).json({ user: cleanUser(user) });
}));

router.post("/auth/login", asyncRoute(async (req, res) => {
  const { email, password } = req.body;
  const user = await User.findOne({ email: String(email || "").toLowerCase() }).select("+passwordHash");
  if (!user || !(await bcrypt.compare(password || "", user.passwordHash)))
    return res.status(401).json({ message: "Invalid email or password" });
  if (user.status !== "active") return res.status(403).json({ message: "Account is inactive" });
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET.length < 32)
    return res.status(500).json({ message: "Set a JWT_SECRET of at least 32 characters in .env" });
  const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "8h" });
  res.json({ token, user: cleanUser(user) });
}));
router.get("/auth/me", auth, (req, res) => res.json({ user: cleanUser(req.user) }));

router.get("/dashboard", auth, asyncRoute(async (_req, res) => {
  const today = new Date().toISOString().slice(0, 10);
  const [employees, activeEmployees, pendingLeaves, presentToday, tasks, completedTasks] = await Promise.all([
    Employee.countDocuments(), Employee.countDocuments({ status: "active" }),
    Leave.countDocuments({ status: "pending" }), Attendance.countDocuments({ date: today, status: "present" }),
    Task.countDocuments(), Task.countDocuments({ status: "done" })
  ]);
  res.json({ employees, activeEmployees, pendingLeaves, presentToday, tasks, completedTasks });
}));

router.get("/employees", auth, asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.status) filter.status = req.query.status;
  if (req.query.department) filter.department = req.query.department;
  if (req.query.search) filter.$or = [
    { name: { $regex: String(req.query.search), $options: "i" } },
    { email: { $regex: String(req.query.search), $options: "i" } }
  ];
  res.json(await Employee.find(filter).sort({ createdAt: -1 }).limit(500));
}));
router.post("/employees", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  const { name, email } = req.body;
  if (!name || !email) return res.status(400).json({ message: "Name and email are required" });
  res.status(201).json(await Employee.create(req.body));
}));
router.patch("/employees/:id", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  const item = await Employee.findByIdAndUpdate(req.params.id, req.body, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: "Employee not found" });
  res.json(item);
}));
router.delete("/employees/:id", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  const item = await Employee.findByIdAndUpdate(req.params.id, { status: "inactive" }, { new: true });
  if (!item) return res.status(404).json({ message: "Employee not found" });
  res.json({ message: "Employee deactivated", employee: item });
}));

router.get("/leaves", auth, asyncRoute(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Leave.find(filter).populate("employee", "name email department").sort({ createdAt: -1 }).limit(500));
}));
router.post("/leaves", auth, asyncRoute(async (req, res) => {
  const { employee, type, startDate, endDate } = req.body;
  if (!employee || !type || !startDate || !endDate) return res.status(400).json({ message: "Employee, type, start date and end date are required" });
  if (new Date(endDate) < new Date(startDate)) return res.status(400).json({ message: "End date must be on or after start date" });
  res.status(201).json(await Leave.create(req.body));
}));
router.patch("/leaves/:id/status", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  if (!["approved", "rejected"].includes(req.body.status)) return res.status(400).json({ message: "Status must be approved or rejected" });
  const item = await Leave.findByIdAndUpdate(req.params.id, { status: req.body.status, reviewedBy: req.user.name }, { new: true, runValidators: true }).populate("employee", "name email");
  if (!item) return res.status(404).json({ message: "Leave request not found" });
  res.json(item);
}));

router.get("/attendance", auth, asyncRoute(async (req, res) => {
  const filter = {};
  if (req.query.date) filter.date = req.query.date;
  if (req.query.employee) filter.employee = req.query.employee;
  res.json(await Attendance.find(filter).populate("employee", "name email department").sort({ date: -1 }).limit(500));
}));
router.post("/attendance/check-in", auth, asyncRoute(async (req, res) => {
  const { employee } = req.body;
  if (!employee) return res.status(400).json({ message: "Employee ID is required" });
  const date = new Date().toISOString().slice(0, 10);
  const item = await Attendance.findOneAndUpdate(
    { employee, date }, { $setOnInsert: { employee, date, checkIn: new Date(), status: "present" } },
    { new: true, upsert: true, runValidators: true, setDefaultsOnInsert: true }
  );
  if (item.checkOut) return res.status(409).json({ message: "Attendance is already checked out", attendance: item });
  res.json(item);
}));
router.patch("/attendance/:id/check-out", auth, asyncRoute(async (req, res) => {
  const item = await Attendance.findByIdAndUpdate(req.params.id, { checkOut: new Date() }, { new: true });
  if (!item) return res.status(404).json({ message: "Attendance record not found" });
  res.json(item);
}));

router.get("/tasks", auth, asyncRoute(async (req, res) => {
  const filter = req.query.status ? { status: req.query.status } : {};
  res.json(await Task.find(filter).sort({ createdAt: -1 }).limit(500));
}));
router.post("/tasks", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  if (!req.body.title) return res.status(400).json({ message: "Task title is required" });
  res.status(201).json(await Task.create(req.body));
}));
router.patch("/tasks/:id", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  const allowed = ["title", "description", "assignedTo", "priority", "status", "dueDate"];
  const update = Object.fromEntries(Object.entries(req.body).filter(([key]) => allowed.includes(key)));
  const item = await Task.findByIdAndUpdate(req.params.id, update, { new: true, runValidators: true });
  if (!item) return res.status(404).json({ message: "Task not found" });
  res.json(item);
}));
router.delete("/tasks/:id", auth, allowRoles("admin", "hr"), asyncRoute(async (req, res) => {
  const item = await Task.findByIdAndDelete(req.params.id);
  if (!item) return res.status(404).json({ message: "Task not found" });
  res.json({ message: "Task deleted" });
}));

module.exports = router;
