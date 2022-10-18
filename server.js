const express = require('express');
const mysql = require('mysql2');
const inquirer = require('inquirer');
const cTable = require('console.table');
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

const getChoice = () => {
    inquirer
        .prompt([
            {
                name: 'choice',
                type: 'list',
                message: 'What would you like to do?',
                choices: ['View All Employees', 'Add Employee', 'Update Employee Role', 'View All Roles', 'Add Role', 'View All Departments', 'Add Department', 'Quit']
            }
        ])
        .then(ans => {
            switch(ans.choice){
                case 'Quit':
                    console.log('Exit');
                    break;
                case 'View All Departments':
                    db.query('SELECT * FROM department ORDER BY department.name ASC', function (err, results) {
                        console.table('\n', results);
                        getChoice();
                    });                    
                    break;
                case 'View All Roles':
                    db.query('SELECT role.title, role.id, department.name, role.salary FROM role JOIN department ON role.department_id = department.id ORDER BY role.title ASC', function(err, results) {
                        console.table('\n', results);
                        getChoice();
                    });
                    break;
                case 'Add Role':
                    addRole();
                    break;
                case 'Add Department':
                    addDepartment();
                    break;
                case 'View All Employees':
                    db.query('SELECT employee.first_name, employee.last_name, role.title, department.name, role.salary, employee.manager_id FROM employee JOIN role ON employee.role_id = role.id JOIN department ON role.department_id = department.id ORDER BY employee.last_name ASC', function(err, results){
                        console.table('\n', results);
                        getChoice();
                    });
                    break;
                default:
                    getChoice();
                    break;
            }
        })
};

const addDepartment = () => {
    inquirer
        .prompt([
            {
                name: 'name',
                type: 'input',
                message: 'Name of the department',
                validate: (input) => {
                    if (input.trim() === ""){
                        return false;
                    }
                    return true;
                }
            }
        ])
        .then(ans => {
            db.query(`INSERT INTO department (name) VALUES ('${ans.name}')`, function (err, results) {
                getChoice();
            });
        })
}

const addRole = () => {
    const departments = [];
    db.query('SELECT * FROM department', function (err, results) {
        results.forEach(department => departments.push(department.name));

        inquirer
        .prompt([
            {
                name: 'department',
                type: 'list',
                message: 'Which department is it in?',
                choices: departments
            },
            {
                name: 'title',
                type: 'input',
                message: 'Title of the role?',
                validate: (input) => {
                    if (input.trim() === ""){
                        return false;
                    }
                    return true;
                }                
            },
            {
                name: 'salary',
                type: 'input',
                message: 'Salary of the role?',
                validate: (input) => {
                    if (isNaN(input)){
                        return 'Please enter only numbers'
                    }
                    return true;
                }
            }
        ])
        .then(ans => {
            let id;
            results.forEach(department => {
                if(department.name === ans.department){
                    id = parseInt(department.id);
                }
            })
            let salary = parseInt(ans.salary);

            db.query(`INSERT INTO role (title, salary, department_id) VALUES ('${ans.title}', ${salary}, ${id})`, function (err,results) {
                getChoice();
            });
        })
    })    
}

app.use((req, res) => res.status(404).end());
app.listen(PORT);
getChoice();