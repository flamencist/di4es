function Engine() {

}

function Engine2() {

}

function Turbo() {
    this.start = function() {
        console.log("Turbo has been started...");
    };
}



Engine.prototype.start = function () {
    console.log("Engine has been started...");
};

Engine2.prototype.start = function () {
    console.log("Engine2 has been started...");
};

function Car(engine,turbo) {
    this.start = function () {
        console.log("=======Car=======");
        if (engine) {
            engine.start();
        }
        turbo.start();
        console.log("Car has been started...");
    };
}

function Car2(engine,turbo) {
    this.start = function () {
        console.log("=======Car2=======");
        if (engine) {
            engine.start();
        }
        turbo.start();
        console.log("Car2 has been started...");
    };
}

di
  .autowired(true)
  .register('engine').as(Engine)
  .register('engine2').as(Engine2)
  .register('turbo').as(Turbo)
  .register('car').as(Car)
  .register('car2').as(Car2).withConstructor().param('engine').ref('engine2');

var car = di.resolve('car');
var car2 = di.resolve('car2');

car.start();
car2.start();