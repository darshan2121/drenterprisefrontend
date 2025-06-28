import { model, Schema } from "mongoose";

const attendanceSchema = new Schema({
  employeeId: {
    type: Schema.Types.ObjectId,
    ref: "Employee",
    required: true
  },
  managerId: {
    type: Schema.Types.ObjectId,
    ref: "Manager",
    required: true
  },
  stepIn: {
    type: Date,
    required: true
  },
  stepOut: {
    type: Date
  },
  totalTime: {
    type: Number // in minutes or seconds, as you prefer
  },
  stepInImage: {
    type: String // URL or base64 string
  },
  stepOutImage: {
    type: String // URL or base64 string
  },
  longitude: {
    type: Number
  },
  latitude: {
    type: Number
  },
  address: {
    type: String
  },
  note: {
    type: String // Optional: note for attendance
  }
}, {
  timestamps: true
});

const Attendance = model("Attendance", attendanceSchema);
export default Attendance;