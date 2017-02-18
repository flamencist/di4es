"use strict";

if (typeof require !== "undefined") {
    var di = require("../lib/di4es.js");
}

describe("ECMAScript 6 specs", function () {
    class DieselEngine {
        constructor(){
            this.hp = 0;
        }
        start(){
            console.log("Diesel engine with " + this.hp + " hp has been started...");
        }
    }

    class PetrolEngine {
        constructor(){
            this.hp = 0;
        }
        start(){
            console.log("Petrol engine with " + this.hp + " hp has been started...");
        }
    }

    class Tractor {
        constructor(dieselEngine,petrolEngine){
            this.dieselEngine = dieselEngine;
            this.petrolEngine = petrolEngine;
        }
    }

    afterEach(function () {
        di.dispose();
    });

    it("create instance of class", function () {
        di
            .autowired(true)
            .register("dieselEngine").as(DieselEngine)
            .register("petrolEngine").as(PetrolEngine)
            .register("tractor").as(Tractor);
        var instance = di.resolve("tractor");
        expect(instance.dieselEngine).toBeDefined();
        expect(instance.petrolEngine).toBeDefined();

    });
});