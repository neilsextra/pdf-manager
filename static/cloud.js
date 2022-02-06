function Cloud(end_point, key_id, instance_crn) {

    this.__end_point = end_point;
    this.__key_id = key_id;
    this.__instance_crn = instance_crn;

}

Cloud.prototype.query = function() {

    return new Promise((accept, reject) => {
        var xhttp = new XMLHttpRequest();

        xhttp.open("GET", `/query?endpoint=${encodeURIComponent(this.__end_point)}&keyid=${encodeURIComponent(this.__key_id)}` +
            `&instancecrn=${encodeURIComponent(this.__instance_crn)}`, true);

        xhttp.onreadystatechange = async function() {

            if (this.readyState === 4 && this.status === 200) {
                var paths = [];
                var response = JSON.parse(this.responseText);

                accept({
                    status: this.status,
                    response: response 
                });

            } else if (this.status === 500) {

                reject({
                    status: this.status,
                    message: this.statusText
                });

            }

        };

        xhttp.send();

    });

}

Cloud.prototype.setup = function(formData) {

    formData.append("endpoint", this.__endpoint);
    formData.append("keyid", this.__key_id);
    formData.append("instancecrn", this.__instance_crn);

}

Cloud.prototype.retreive = function(filename) {

    return new Promise((accept, reject) => {

        fetch(`/retrieve?account=${encodeURIComponent(this.__account)}&token=${encodeURIComponent(this.__token)}` +
                `&container=${encodeURIComponent(this.__container)}` +
                `&directory=${encodeURIComponent(this.__directory)}&filename=${encodeURIComponent(filename)}`, {
                    responseType: 'blob'
                })
            .then(res => res.blob())
            .then(blob => {
                accept(blob.arrayBuffer())
            });

    })

}

Cloud.prototype.train = function(trainingURL, apimKey) {

    return new Promise((accept, reject) => {

        fetch(`/train?account=${encodeURIComponent(this.__account)}&token=${encodeURIComponent(this.__token)}` +
                `&container=${encodeURIComponent(this.__container)}` +
                `&directory=${encodeURIComponent(this.__directory)}` +
                `&formURL=${encodeURIComponent(trainingURL)}` +
                `&apimKey=${encodeURIComponent(apimKey)}`
            )
            .then(res => res.text())
            .then(text => {
                accept(text)
            });

    })

}

Cloud.prototype.analyze = function(filename) {

    return new Promise((accept, reject) => {

        fetch(`/analyze?account=${encodeURIComponent(this.__account)}&token=${encodeURIComponent(this.__token)}` +
                `&container=${encodeURIComponent(this.__container)}` +
                `&directory=${encodeURIComponent(this.__directory)}` +
                `&filename=${encodeURIComponent(filename)}`
            )
            .then(res => res.text())
            .then(text => {
                accept(text)
            });

    })

}