// localStorage Manage Mdoule
var LS = function () {
    this.key = null;
    this.value = null;
};
LS.prototype.get = function (key, initValue = {}) {
    this.key = key;
    if ( localStorage[key] === undefined) localStorage[key] = JSON.stringify(initValue);
    try {this.value = JSON.parse(localStorage[key]);}
    catch (e) {console.log(e);}
    return this;
};
LS.prototype.saveLS = function () { //TODO : deprecated
    localStorage[this.key] = JSON.stringify(this.value);
    return this;
};
LS.prototype.clear = function () {
    localStorage[this.key] = JSON.stringify({});
    return this;
};
LS.prototype.rename = function (newName) {
    localStorage[newName] = this.value;
    delete localStorage[this.key];
    this.key = newName;
    return this;
};
LS.prototype.print = function () {
    $.each(this.value, function (key, value) {console.log(key, value);});
    return this;
};

var lsmm = new LS();

function todaykey() {
    let q = new Date();
    return "d"+(q.getMonth()+1)+"/"+q.getDate();
}