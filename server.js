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
                    db.query('SELECT role.title, role.id, department.name AS department, role.salary FROM role INNER JOIN department ON role.department_id = department.id ORDER BY role.title ASC', function(err, results) {
                        console.table('\n', results);
                        getChoice();
                    });
                    break;
                case 'View All Employees':
                    db.query('SELECT a.id, a.first_name, a.last_name, role.title, department.name AS department, role.salary, CONCAT(b.first_name, " ", b.last_name) AS manager FROM employee a INNER JOIN role ON a.role_id = role.id INNER JOIN department ON role.department_id = department.id LEFT JOIN employee b ON b.id = a.manager_id ORDER BY a.last_name ASC', function(err, results){
                        console.table('\n', results);
                        getChoice();
                    });
                    break;
                case 'Add Department':
                    addDepartment();
                    break;
                case 'Add Role':
                    addRole();
                    break;                
                case 'Add Employee':
                    addEmployee();
                    break;
                case 'Update Employee Role':
                    updateEmployeeRole();
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
            db.query(`INSERT INTO department (name) VALUES (?)`, ans.name, function (err, results) {
                getChoice();
            });
        })
};

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
            let department_id;
            results.forEach(department => {
                if(department.name === ans.department){
                    department_id = parseInt(department.id);
                }
            })
            let salary = parseInt(ans.salary);

            db.query(`INSERT INTO role (title, salary, department_id) VALUES (?, ?, ?)`, [ans.title, salary, department_id], function (err,results) {
                getChoice();
            });
        })
    })    
};

const addEmployee = () => {
    const rolesArray = [];
    const employees = ['None'];
    db.query('SELECT * FROM employee', (err, result) => {
        result.forEach(employee => employees.push(`${employee.first_name} ${employee.last_name}`));
        db.query('SELECT * FROM role', function (err, res) {
            res.forEach(role => rolesArray.push(role.title));
            inquirer
                .prompt([
                    {
                        name: 'first_name',
                        message: 'What is their first name?',
                        type: 'input',
                        validate: (input) => {
                            if(input === ""){
                            return 'Please enter a name.'
                        }
                        return true;
                        }
                    },
                    {
                        name: 'last_name',
                        message: 'What is their last name?',
                        type: 'input',
                        validate: (input) => {
                            if(input === ""){
                                return 'Please enter a name.'
                            }
                            return true;
                        }
                    },
                    {
                        name: 'roles',
                        message: 'What role are they in?',
                        type: 'list',
                        choices: rolesArray
                    },
                    {
                        name: 'manager',
                        message: 'Who is their manager?',
                        type: 'list',
                        choices: employees
                    }
                ])
                .then(ans => {
                    const {first_name, last_name, roles, manager} = ans;
                    let role_id;
                    res.forEach(role => {
                        if(role.title === roles){
                            role_id = parseInt(role.id);
                        }
                    })
                    let manager_id;
                    result.forEach(employee => {
                        if(`${employee.first_name} ${employee.last_name}` === manager){
                            manager_id = parseInt(employee.id);
                        }
                    })
                    db.query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)', [first_name, last_name, role_id, manager_id], (err, results) => {
                        console.log(`Added ${first_name} ${last_name} to database`);
                        getChoice();
                    })
                })
        });
    });    
};

const updateEmployeeRole = () => {
    const employee = [];
    const rolesArray = [];
    db.query('SELECT id, CONCAT(employee.first_name, " ", employee.last_name) AS name FROM employee', function (err, people) {
        people.forEach(person => employee.push(person.name));
        db.query('SELECT title, id FROM role', (err, roles) => {
            roles.forEach(role => rolesArray.push(role.title));
            inquirer
                .prompt([
                    {
                        name: 'person',
                        type: 'list',
                        message: 'Whose role would you like to update?',
                        choices: employee
                    },
                    {
                        name: 'title',
                        type: 'list',
                        message: 'What role would you like to update them to?',
                        choices: rolesArray
                    }
                ])
                .then(ans => {
                    let employee_id;
                    let role_id;
                    people.forEach(person => {
                        if(person.name === ans.person){
                            employee_id = parseInt(person.id);
                        }
                    })

                    roles.forEach(role => {
                        if(role.title === ans.title){
                            role_id = parseInt(role.id);
                        }
                    })

                    db.query('UPDATE employee SET role_id = ? WHERE id = ?', [role_id, employee_id], (err, results) => {
                        console.log(`Updated ${ans.person}`);
                        getChoice();
                    });
                })
        })
    });
};

app.use((req, res) => res.status(404).end());
app.listen(PORT);
getChoice();