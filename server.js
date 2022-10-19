const express = require('express');
const getChoice = require('./src/query');

const PORT = process.env.PORT || 4001;
const app = express();

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.use((req, res) => res.status(404).end());
app.listen(PORT);

getChoice();