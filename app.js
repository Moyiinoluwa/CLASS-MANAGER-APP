const express = require('express');
const connectdb = require('./Config/connectdb');
const errorHandler = require('./Middleware/errorHandler');
//const validate = require('./Middleware/validateToken');
const dotenv = require('dotenv').config()

const app = express();

//connection string
connectdb()

//json parser
app.use(express.json())

//middleware
app.use('/api/students', require('./Routes/studentRoutes'))
app.use('/api/teachers', require('./Routes/teacherRoutes'))
app.use('/api/admin', require('./Routes/adminRoutes'))

//validate token middleware
//app.use(validate)
//validate()

//error middleware
errorHandler()



//listen on port 
const PORT = process.env.PORT || 3002

 app.listen(PORT, () => {
    console.log(`listen on port ${PORT}`)
 })