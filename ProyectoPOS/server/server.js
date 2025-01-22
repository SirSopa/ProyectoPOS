const express = require('express');
const bodyParser = require('body-parser');
const cors = require('cors');
const soap = require('soap');
const http = require('http');
const path = require('path');
const xml = require('fs').readFileSync('requirements.wsdl', 'utf8');
const fs = require('fs');

const reloj = new Date();
const app = express();
const port = 3000;
const IP = '192.168.1.64';

app.use(express.static(path.join(__dirname, '..', 'css'))); // Sirve los archivos CSS
app.use(express.static(path.join(__dirname, '..', 'html'))); // Sirve los archivos HTML

app.use(express.static(path.join(__dirname, '..', 'public')));

// Ruta principal que sirve el archivo index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'html', 'index.html'));
});

app.use(bodyParser.json());
app.use(cors());


/* Servicio SOAP */
const service = {
    ServicioPaqueteria: {
        ServicioPaqueteriaPort: {
            GeneraID: (args) => {

                const nombreRemitente = args.nombreRemitente;
                const nombreDestinatario = args.nombreDestinatario;
                const horas = reloj.getHours();
                const minutos = reloj.getMinutes();
                const segundos = reloj.getSeconds();

                const idGenerado = `${nombreRemitente[0]}${nombreRemitente[1]}${nombreDestinatario[0]}${nombreDestinatario[1]}${horas}${minutos}${segundos}`;
                return { result: idGenerado };
            },

            CotizaEnvio: (args) => {
                const ancho = parseInt(args.ancho);
                const largo = parseInt(args.largo);
                const alto = parseInt(args.alto);
                const peso = parseInt(args.peso);

                const costo = (ancho * largo * alto * peso) / 500;
                return { result: costo };
            },


            RecibirComentarios: (args) => {
                const nombreCliente = args.nombreCliente;
                const comentario = args.comentario;

                const cadena = `*Gracias ${nombreCliente} por el siguiente comentario: \n${comentario}`;

                return { result: cadena };
            }
        },
    },
};

/*Servicio REST*/
app.get('/obtenerFrase', async (req, res) => {
    fetch("https://www.affirmations.dev/")
        .then(response => {

            if (!response.ok) {
                console.log("no hay respuesta");
            }

            return response.json();
            
        })
        .then(data => {
            res.json(data);
        })
        .catch(error => {
            console.log(error);
        });
});


app.post('/agregarComentario', async (req, res) => {

    const { nombreCliente, comentario } = req.body;

    try {
        const url = `http://${IP}:${port}/ServicioPaqueteria?wsdl`;
        const args = { nombreCliente, comentario };

        soap.createClient(url, (err, client) => {

            if (err) {
                return res.status(500).json({ error: 'Algo sucedio con el servicio SOAP COMENTARIOS' });
            }

            client.RecibirComentarios(args, (err, response) => {

                if (err) {
                    return res.status(500).json({ error: 'Algo sucedio con el servicio SOAP COMENTARIOS2' });

                }

                const nuevoNombre = nombreCliente;
                const comentario = response.result;

                const nuevoComentario = {
                    nombreCliente: nuevoNombre,
                    comentario: comentario
                }


                leerArchivoJSON('comentarios.json')
                    .then(comentarios => {

                        comentarios.push(nuevoComentario);

                        fs.writeFile('comentarios.json', JSON.stringify(comentarios, null, 2), 'utf8', (err) => {
                            if (err) {
                                return res.status(500).json({ error: "Error al guardar el archivo" });
                            }

                            res.json({ resComentario: "Recibimos tu comentario" });
                        });
                    })

                    .catch(error => {
                        return res.status(404).json({ error: "error en la base de datos" });
                    });

            });

        });

    } catch (error) {
        res.status(500).json({ error: 'No se pudo procesar la solicitud :(' });
    }
});


app.get('/mostrarComentarios', async (req, res) => {
    leerArchivoJSON('comentarios.json')
        .then(comentarios => {

            res.json(comentarios);

        })

        .catch(error => {
            return res.status(404).json({ error: "Error al consultar los comentarios" });
        });

});



app.post('/agregarEnvio', async (req, res) => {

    const { nombreRemitente, nombreDestinatario, peso, alto, ancho, largo, ciudadOrigen, ciudadDestino } = req.body;

    try {
        const url = `http://${IP}:${port}/ServicioPaqueteria?wsdl`;
        const args = { nombreRemitente, nombreDestinatario };
        const args1 = { ancho, largo, alto, peso };
        soap.createClient(url, (err, client) => {

            if (err) {
                return res.status(500).json({ error: 'Algo sucedio con el servicio SOAP' });
            }

            client.GeneraID(args, (err, respuesta) => {

                client.CotizaEnvio(args1, (err, response) => {
                    if (err) {
                        return res.status(500).json({ error: 'Algo sucedio con la operación en SOAP' });
                    }

                    const costo = response.result;
                    const id = respuesta.result;
                    const nuevoEnvio = {
                        id: id,
                        nombreRemitente: nombreRemitente,
                        nombreDestinatario: nombreDestinatario,
                        peso: peso,
                        alto: alto,
                        ancho: ancho,
                        largo: largo,
                        ciudadOrigen: ciudadOrigen,
                        ciudadDestino: ciudadDestino
                    };

                    leerArchivoJSON('envios.json')
                        .then(contenido => {

                            contenido.push(nuevoEnvio);

                            fs.writeFile('envios.json', JSON.stringify(contenido, null, 2), 'utf8', (err) => {
                                if (err) {
                                    return res.status(500).json({ error: "Error al guardar el archivo" });
                                }
                                res.json({ id: id, costo: costo });
                            });


                        })

                        .catch(error => {
                            return res.status(404).json({ error: "Error al leer la base de datos" })

                        });

                })



            });
        });
    } catch (error) {
        res.status(500).json({ error: 'No se pudo procesar la solicitud :(' });
    }
});



//leer el contenido del archivo 
function leerArchivoJSON(rutaArchivo) {
    return new Promise((resolve, reject) => {
        fs.readFile(rutaArchivo, 'utf8', (err, data) => {
            if (err) {
                return reject(`Error al leer el archivo: ${err.message}`);
            }
            try {
                const jsonData = JSON.parse(data);
                resolve(jsonData); // Devuelve el contenido del archivo JSON
            } catch (parseError) {
                reject(`Error al analizar el JSON: ${parseError.message}`);
            }
        });
    });
}



//Consultar envios
app.get('/consultarEnvios:id', (req, res) => {

    leerArchivoJSON('envios.json')
        .then(contenido => {

            const id = req.params.id;
            const envio = contenido.find(e => e.id === id);
            if (!envio) {
                return res.status(404).json({ error: "Envío no encontrado" })
            } else {
                res.json(envio)
            }

        })
        .catch(error => {
            return res.status(404).json({ error: "Error al leer la base de datos" })
        });
});





// Actualizar un envío
app.put('/actualizarEnvio:id', (req, res) => {
    const id = req.params.id;
    const datosEditados = req.body; // Los datos enviados en la solicitud

    leerArchivoJSON('envios.json')
        .then(contenido => {
            const index = contenido.findIndex(e => e.id === id);
            if (index === -1) {
                return res.status(404).json({ error: "Envío no encontrado" });
            }

            // Actualizar los datos del envío
            contenido[index] = { ...contenido[index], ...datosEditados };

            // Guardar el archivo actualizado
            fs.writeFile('envios.json', JSON.stringify(contenido, null, 2), 'utf8', (err) => {
                if (err) {
                    return res.status(500).json({ error: "Error al guardar el archivo" });
                }
                res.json({ mensaje: "Envío actualizado correctamente" });
            });
        })
        .catch(error => {
            return res.status(500).json({ error: "Error al leer la base de datos" });
        });
});

// Eliminar un envío
app.delete('/eliminarEnvio:id', (req, res) => {
    const id = req.params.id;

    leerArchivoJSON('envios.json')
        .then(contenido => {
            const index = contenido.findIndex(e => e.id === id);
            if (index === -1) {
                return res.status(404).json({ error: "Envío no encontrado" });
            }

            // Eliminar el envío del array
            contenido.splice(index, 1);

            // Guardar el archivo actualizado
            fs.writeFile('envios.json', JSON.stringify(contenido, null, 2), 'utf8', (err) => {
                if (err) {
                    return res.status(500).json({ error: "Error al guardar el archivo" });
                }
                res.json({ mensaje: "Envío eliminado correctamente" });
            });
        })
        .catch(error => {
            return res.status(500).json({ error: "Error al leer la base de datos" });
        });
});



const server = http.createServer(app);


soap.listen(server, '/ServicioPaqueteria', service, xml);


server.listen(port, '0.0.0.0', () => {

    console.log(`Servidor REST corriendo en http://${IP}:${port}`);
    console.log(`Servicio SOAP corriendo en http://${IP}:${port}/wsdl?wsdl`);
});


