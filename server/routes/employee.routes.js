import express from "express";
const router = express.Router();




// Import controllers

import{
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployees
} from "../controller/employee.controller.js"
import { authenticateUser } from "../utils/middlewere.js";


router.post("/",authenticateUser,createEmployee)
router.put("/:id",authenticateUser,updateEmployee)
router.delete("/:id",authenticateUser,deleteEmployee)
router.get("/all",authenticateUser,getEmployees)







export default router;