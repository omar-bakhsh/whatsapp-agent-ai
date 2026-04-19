const fs = require('fs');
const pdf = require('pdf-parse');

let dataBuffer = fs.readFileSync('جدول صيانات الدورية/جدول صيانات الدورية-متخصص مازدا.pdf');

pdf(dataBuffer).then(function(data) {
    console.log(data.text);
}).catch(function(error){
    console.log("Error:", error);
});
