function Cloud(end_point, key_id, instance_crn) {

    this.__end_point = end_point;
    this.__key_id = key_id;
    this.__instance_crn = instance_crn;

}

Cloud.prototype.query = function(bucket) {

    return new Promise((accept, reject) => {
        var xhttp = new XMLHttpRequest();

        xhttp.open("GET", `/query?endpoint=${encodeURIComponent(this.__end_point)}&keyid=${encodeURIComponent(this.__key_id)}` +
            `&instancecrn=${encodeURIComponent(this.__instance_crn)}&bucket=${encodeURIComponent(bucket)}`, true);

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

    formData.append("endpoint", this.__end_point);
    formData.append("keyid", this.__key_id);
    formData.append("instancecrn", this.__instance_crn);

}

Cloud.prototype.retrieve = function(bucket,filename) {

    return new Promise((accept, reject) => {

        fetch(`/retrieve?endpoint=${encodeURIComponent(this.__end_point)}&` +
              `keyid=${encodeURIComponent(this.__key_id)}&` +
              `instancecrn=${encodeURIComponent(this.__instance_crn)}` + 
              `&bucket=${encodeURIComponent(bucket)}&` +
              `filename=${encodeURIComponent(filename)}`, {
                    responseType: 'blob'
                })
            .then(res => res.blob())
            .then(blob => {
                accept(blob.arrayBuffer())
            });

    })

}