class DieselEngine {
  start() {
    console.log("Diesel engine has been started...");
  }
}

class Car {
    constructor(engine){
        this.engine = engine;
    }
    start() {
        this.engine.start();
        console.log("Car has been started...");
    };
}

di
  .autowired(true)
  .register("engine")
    .as(DieselEngine)
  .register("car")
    .as(Car);

var car = di.resolve("car");
car.start();
