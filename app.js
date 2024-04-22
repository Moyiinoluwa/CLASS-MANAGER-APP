const express = require('express');
const connectdb = require('./Config/connectdb');
const errorHandler = require('./Middleware/errorHandler');
const dotenv = require('dotenv').config()
//const io = require('socket.io')(3002)
const cors = require('cors')


const app = express();

app.use(cors())
 
app.use('/Assignment', express.static('Assignment'));


//connection string
connectdb()

//json parser
app.use(express.json())

//middleware
app.use('/api/students', require('./Routes/studentRoutes'));
app.use('/api/teachers', require('./Routes/teacherRoutes'));
app.use('/api/admin', require('./Routes/adminRoutes'));


//error middleware
errorHandler();


//listen on port 
const PORT = process.env.PORT || 3002

 app.listen(PORT, () => {
    console.log(`listen on port ${PORT}`)
 })