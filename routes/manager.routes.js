import express from "express";
const router = express.Router();
// Import controllers
import {
    createManager,
    getManager,
    updateManager,
    deleteManager,
    getAllManagers,
    loginManager
} from "../controller/manager.controller.js";   
// Define routes
router.post("/", createManager);    
router.post("/login",loginManager)
router.get("/all", getAllManagers);
router.get("/:id", getManager);
router.put("/:id", updateManager);  
router.delete("/:id", deleteManager);

export default router;