import { model,Schema, Types } from "mongoose";


const managerSchema = new Schema({
  email: {
    type: String,
    required: true,
    unique: true,
  },
  password: {
    type: String,
    required: true,
  },
  name: {
    type: String,
    required: true,
  },
  mobile: {
    type: String,
    required: true,
  },
  address: {
    type: String,
    required: true,
  },
 createdBy:{
  type:Schema.Types.ObjectId,
  ref:"Admin"
 },
 isActive:{
type:Boolean,
default:false
 }
}, {
  timestamps: true
});

const Manager = model('Manager', managerSchema);
export default Manager;
