const express = require('express');
const mysql = require('mysql2');
const inquirer = require('inquirer');
const cTable = require('console.table');
const util = require('util');
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

const query = util.promisify(db.query).bind(db);

const getChoice = () => {
    inquirer
        .prompt([
            {
                name: 'choice',
                type: 'list',
                message: 'What would you like to do?',
                choices: ['View All Employees', 'Add Employee', 'Update Employee Role', 'View All Roles', 'Add Role', 'View All Departments', 'Add Department', 'Update Employee Manager', 'View By Manager', 'Quit']
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
                case 'View By Manager':
                    viewByManager();
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
                case 'Update Employee Manager':
                    updateEmployeeManager();
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

async function addEmployee(){
    const rolesArray = [];
    const rolesRes = [];
    const employees = ['None'];
    const employeesRes = [];
    await query('SELECT id, CONCAT(first_name, " ", last_name) AS name FROM employee').then(res => {
        res.forEach(employee => {
            employees.push(employee.name)
            employeesRes.push(employee);
        });
    });
    await query('SELECT id, title FROM role').then(res => {
            res.forEach(role => {
                rolesArray.push(role.title)
                rolesRes.push(role);
            });
    });
            
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
        .then(async ans => {
            const {first_name, last_name, roles, manager} = ans;
            let role_id;
            rolesRes.forEach(role => {
                if(role.title === roles){
                    role_id = parseInt(role.id);
                }
            })
            let manager_id;
            employeesRes.forEach(employee => {
                if(employee.name === manager){
                    manager_id = parseInt(employee.id);
                }
            });
            await query('INSERT INTO employee (first_name, last_name, role_id, manager_id) VALUES (?, ?, ?, ?)', [first_name, last_name, role_id, manager_id]).then( res => console.log(`Added ${first_name} ${last_name} to database`));
                        
            getChoice();
        });    
};

async function updateEmployeeRole(){
    const employeeChoice = [];
    const employeeRes = [];
    const rolesChoice = [];
    const rolesRes = [];
    await query('SELECT id, CONCAT(employee.first_name, " ", employee.last_name) AS name FROM employee')
        .then(res => res.forEach(person => {
            employeeRes.push(person);
            employeeChoice.push(person.name)
        }));
    
    await query('SELECT title, id FROM role').then(res => res.forEach(role => {
        rolesChoice.push(role.title);
        rolesRes.push(role);
    }));

    inquirer
        .prompt([
            {
                name: 'person',
                type: 'list',
                message: 'Whose role would you like to update?',
                choices: employeeChoice
            },
            {
                name: 'title',
                type: 'list',
                message: 'What role would you like to update them to?',
                choices: rolesChoice
            }
        ])
        .then(async ans => {
            let employee_id;
            let role_id;
            employeeRes.forEach(person => {
                if(person.name === ans.person){
                    employee_id = parseInt(person.id);
                }
            })

            rolesRes.forEach(role => {
                if(role.title === ans.title){
                    role_id = parseInt(role.id);
                }
            })

            await query('UPDATE employee SET role_id = ? WHERE id = ?', [role_id, employee_id])
                .then(ans => console.log(`Updated ${ans.person}`));
                
            getChoice();
        });
}

async function updateEmployeeManager(){
    const employees = [];
    const employeeRes = [];

    await query('SELECT id, CONCAT(employee.first_name, " ", employee.last_name) AS name FROM employee')
        .then (res => {
            res.forEach(person => {
                employees.push(person.name);
                employeeRes.push(person);
            });
        });

    inquirer
        .prompt([
            {
                name: 'employee',
                type: 'list',
                message: "Which employee's manager would you like to update?",
                choices: employees
            },
            {
                name: 'newManager',
                type: 'list',
                message: 'Who is their new manager? Select same employee for none.',
                choices: employees
            }
        ])
        .then( async ans => {
            let manager_id;
            let employee_id;
            employeeRes.forEach(person => {                
                if (ans.employee == ans.newManager){
                    manager_id = null;
                }else{                    
                    if(person.name === ans.newManager){
                        manager_id = parseInt(person.id);
                    }                   
                }

                if(ans.employee === person.name){
                    employee_id = person.id;
                }
            });

            await query('UPDATE employee SET manager_id = ? WHERE id = ?', [manager_id, employee_id]).then(ans => console.log(`Updated ${ans.employee}'s manager.`))
                
            getChoice();
        })    
}

async function viewByManager(){
    const employees = [];
    const employeeRes = [];

    await query('SELECT id, CONCAT(employee.first_name, " ", employee.last_name) AS name FROM employee')
        .then (res => {
            res.forEach(employee => {
                employees.push(employee.name)
                employeeRes.push(employee);
            });
        });

    inquirer
        .prompt([
            {
                name: 'manager',
                type: 'list',
                message: 'Whose subordinates would you like to view?',
                choices: employees
            }
        ])
        .then(async ans => {
            let manager_id;
            employeeRes.forEach(employee => {
                if(employee.name === ans.manager){
                    manager_id = employee.id;
                }
            });

            await query('SELECT * FROM employee WHERE manager_id = ?', manager_id).then(res => console.table(res));                    
            getChoice();           
        })
}

app.use((req, res) => res.status(404).end());
app.listen(PORT);
getChoice();