const mongoose = require("mongoose");

const userSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true, select: false },
  role: { type: String, enum: ["admin", "hr", "employee"], default: "employee" },
  department: { type: String, default: "" },
  jobTitle: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active" }
}, { timestamps: true });

const employeeSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true },
  email: { type: String, required: true, lowercase: true, trim: true },
  department: { type: String, default: "General" },
  jobTitle: { type: String, default: "Employee" },
  phone: { type: String, default: "" },
  status: { type: String, enum: ["active", "inactive"], default: "active" },
  joinedAt: { type: Date, default: Date.now }
}, { timestamps: true });

const leaveSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  type: { type: String, required: true, trim: true },
  startDate: { type: Date, required: true },
  endDate: { type: Date, required: true },
  reason: { type: String, default: "" },
  status: { type: String, enum: ["pending", "approved", "rejected"], default: "pending" },
  reviewedBy: { type: String, default: "" }
}, { timestamps: true });

const attendanceSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: "Employee", required: true },
  date: { type: String, required: true },
  checkIn: { type: Date, default: null },
  checkOut: { type: Date, default: null },
  status: { type: String, enum: ["present", "late", "absent"], default: "present" }
}, { timestamps: true });
attendanceSchema.index({ employee: 1, date: 1 }, { unique: true });

const taskSchema = new mongoose.Schema({
  title: { type: String, required: true, trim: true },
  description: { type: String, default: "" },
  assignedTo: { type: String, default: "" },
  priority: { type: String, enum: ["low", "medium", "high"], default: "medium" },
  status: { type: String, enum: ["todo", "in-progress", "done"], default: "todo" },
  dueDate: { type: Date, default: null }
}, { timestamps: true });

module.exports = {
  User: mongoose.model("User", userSchema),
  Employee: mongoose.model("Employee", employeeSchema),
  Leave: mongoose.model("Leave", leaveSchema),
  Attendance: mongoose.model("Attendance", attendanceSchema),
  Task: mongoose.model("Task", taskSchema)
};
