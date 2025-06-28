import express from "express";
const router = express.Router();




// Import controllers

import{
    createEmployee,
    updateEmployee,
    deleteEmployee,
    getEmployees
} from "../controller/employee.controller.js"


router.post("/",createEmployee)
router.put("/:id",updateEmployee)
router.delete("/:id",deleteEmployee)
router.get("/all",getEmployees)







export default router;