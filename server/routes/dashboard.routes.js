import express from "express";
const Router = express.Router()




import {
    getDashboardData
} from "../controller/dashboard.controller.js";


Router.get("/",getDashboardData)



export default Router;

