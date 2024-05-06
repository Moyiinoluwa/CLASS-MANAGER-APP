const express = require('express');
const connectdb = require('./Config/connectdb');
const errorHandler = require('./Middleware/errorHandler');
const dotenv = require('dotenv').config()
const swaggerJSDoc = require('swagger-jsdoc')
const swaggerUi = require('swagger-ui-express')
 

const app = express();
const PORT = process.env.PORT || 3002



app.use('/Assignment', express.static('Assignment'));

 
//connection string
connectdb()

//json parser
app.use(express.json())

//api routes
app.use('/api/students', require('./Routes/studentRoutes'));
app.use('/api/teachers', require('./Routes/teacherRoutes'));
app.use('/api/admin', require('./Routes/adminRoutes'));


//error middleware
errorHandler();


const swaggerOptions = {
   swaggerDefinition:  {
      openapi: '3.0.0',
      info: {
         version: '1.0.0',
         title: 'Class Manager Api',
         description: 'Api for Class Manager App',
         contact: {
            name: 'Project'
         },
         servers: ['http://localhost:3002']
      },
      schemes: ['http', 'https'],
   },
   apis:['Controlers/*.js']
}
  
//open an instance for swagger
const swaggerDocs = swaggerJSDoc(swaggerOptions)
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerDocs))


app.get('/', (req, res) => {
   res.send('Welcome to the Class Manager API!');
});

//listen on port 
 app.listen(PORT, () => {
    console.log(`listen on port ${PORT}`)
 })