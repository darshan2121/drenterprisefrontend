import express from "express";
const router = express.Router();



// Import controllers
import { 
  createAdmin, 
  loginAdmin, 
  getAllAdmins, 
  getAdminById, 
  updateAdmin, 
  deleteAdmin 
} from "../controller/admin.controller.js";    

// Define routes
router.post("/", createAdmin);
router.post("/login", loginAdmin); 
router.get("/all", getAllAdmins);
router.get("/:id", getAdminById);
router.put("/:id", updateAdmin);
router.delete("/:id", deleteAdmin);








export default router;
