const PDFDocument = require('pdfkit');

const generateStudentReport = (student, achievements, res) => {
    const doc = new PDFDocument();

    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Academic Achievement & Analytics System', { align: 'center' });
    doc.moveDown();
    doc.fontSize(16).text('Student Performance Report', { align: 'center' });
    doc.moveDown();

    // Student Details
    doc.fontSize(12).text(`Name: ${student.name}`);
    doc.text(`Email: ${student.email}`);
    if (student.studentProfile) {
        doc.text(`Roll Number: ${student.studentProfile.rollNumber}`);
        doc.text(`Branch: ${student.studentProfile.branch}`);
        doc.text(`Year/Sem: ${student.studentProfile.admissionYear} / ${student.semester}`); // using virtual for semester
    }
    doc.moveDown();

    // Achievements Summary
    doc.fontSize(14).text('Achievements Summary', { underline: true });
    doc.moveDown();

    const stats = achievements.reduce((acc, curr) => {
        acc[curr.type] = (acc[curr.type] || 0) + 1;
        return acc;
    }, {});

    Object.keys(stats).forEach(type => {
        doc.fontSize(12).text(`${type}: ${stats[type]}`);
    });
    doc.moveDown();

    // Detailed List
    doc.fontSize(14).text('Detailed Achievements', { underline: true });
    doc.moveDown();

    achievements.forEach((ach, index) => {
        doc.fontSize(12).text(`${index + 1}. ${ach.title} (${ach.type})`);
        doc.fontSize(10).text(`   Status: ${ach.status}`);
        doc.text(`   Date: ${ach.createdAt.toDateString()}`);
        doc.moveDown(0.5);
    });

    doc.end();
};

const generateClassReport = (students, branch, year, res) => {
    const doc = new PDFDocument();
    doc.pipe(res);

    doc.fontSize(20).text('Class Performance Report', { align: 'center' });
    doc.fontSize(14).text(`Branch: ${branch}, Year: ${year}`, { align: 'center' });
    doc.moveDown();

    students.forEach((student, index) => {
        doc.fontSize(12).text(`${index + 1}. ${student.name} - ${student.studentProfile.rollNumber}`);
    });

    doc.end();
};


module.exports = { generateStudentReport, generateClassReport };
