const express = require('express');

const app = express();

/* require all the routes here */
const authRouter = require('./routes/auth.routes')

/* using all the routes here */
app.use("/api/auth", authRouter)



app.use(express.json())

module.exports = app