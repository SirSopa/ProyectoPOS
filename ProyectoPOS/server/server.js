const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const soap = require('soap');
const http = require('http');
const path = require('path');
const xml = require('fs').readFileSync('requirements.wsdl', 'utf8');

const app = express();
const port = 3000;
const IP = 'localhost';

app.use(express.static(path.join(__dirname, "public")));

app.use(bodyParser.json());
app.use(cors());