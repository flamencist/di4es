class DieselEngine {
    constructor(){
        this.hp = 0;
    }
    start() {
        console.log("Diesel engine with " + this.hp + " hp has been started...");
    }
}

class Car {
    constructor(engine, year){
        this.engine = engine;
        this.year = year;
    }
    start() {
        this.engine.start();
    };
}

di
    .autowired(false)
    .register("dieselEngine")
        .as(DieselEngine)
        .withProperties()
        .prop("hp").val(42)
    .register("car")
        .as(Car)
        .withConstructor()
        .param().ref("dieselEngine")
        .param().val(1976);

var car = di.resolve("car");

car.start(); // Diesel engine with 42 hp has been started...