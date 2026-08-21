const pdfParse = require('pdf-parse')
const generateInterViewReport = require('../services/ai .service')
const interviewReportModel = require('../models/interview.model')


async function generateInterViewReportController(req,res){

    const resumeContent = pdfParse(req.file.buffer)
    const {selfDescription, jobDescription} = req.body

    const interViewReportByAi = await generateInterViewReport({
        resume : resumeContent,
        selfDescription,
        jobDescription
    })

    const interviewReport = await interviewReportModel.create({
        user : req.user.id,
        resume : resumeContent,
        selfDescription,
        jobDescription,
        ...interViewReportByAi
    })

    res.status(201).json({
        message : "Interview report generated successfully",
        interviewReport
    })
}


module.exports = {generateInterViewReportController}