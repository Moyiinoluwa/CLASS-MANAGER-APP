const mongoose = require('mongoose')

const connectdb = async () => {
    try {
        const connection = await mongoose.connect(process.env.CONNECTION)
        console.log('connected to database');

    } catch (error) {
        console.log(error)
    }
}


module.exports = connectdb;