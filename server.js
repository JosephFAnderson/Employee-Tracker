const express = require('express');
const mysql = require('mysql2');
require('dotenv').config();

const PORT = process.env.PORT || 4001;
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

const db = mysql.createConnection(
    {
        host: 'localhost',
        user: 'root',
        password: process.env.pw,
        database: 'employee_tracker_db'
    },
    console.log('Coonected to the employee_tracker_db database.')
);

// Query to display all departments
db.query('SELECT * FROM department', function (err, results) {
    console.log(results);
})

// Query to display all roles
db.query('SELECT role.id, role.title, role.salary, department.name FROM role JOIN department ON role.department_id = department.id', function (err, results) {
    console.table(results);
});

// Query to display all employees
db.query('SELECT employee.first_name, employee.last_name, role.title, department.name, role.salary, employee.manager_id FROM employee JOIN role ON employee.role_id = role.id JOIN department ON role.department_id = department.id', function (err, results){
   console.table(results); 
});

app.use((req, res) => res.status(404).end());
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));