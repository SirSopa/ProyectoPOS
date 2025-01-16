
function obtenerFrase() {
    fetch("https://www.affirmations.dev/")
        .then(response => {

            if (!response.ok) {
                console.log("no hay respuesta");
            }

            return response.json();


        })
        .then(data => {
            console.log(data.affirmation);
        })
        .catch(error => {
            console.log(error);
        });
}

obtenerFrase();

