export class FakeApp {
    // This class offers interfaces identical to the App class
    // Will be used to run unit tests with no DOM or external dependencies

    constructor(){
        this.event_logs = []
        this.event_logs_to_process = []
        this.event_listeners = {}
    }

    // Would normally raise an envent on the DOM
    trigger_event(name, data){
        this.event_logs.push({
            'name' : name,
            'data' : data
        })
        
        if (this.event_listeners.hasOwnProperty(name)){
            this.event_logs_to_process.push({
                'name' : name,
                'data' : data
            })
        }
    }

    // Return the number of event of a given type that has been raised
    count_event(name){
        let n=0;
        for (let i=0; i<this.event_logs.length; i++){
            if (this.event_logs[i].name == name){
                n++
            }
        }

        return n
    }

    // Executes the events like the browser would do
    process_events(){
        for (let i=0; i<this.event_logs_to_process.length; i++)
        {
            let name = this.event_logs_to_process[i].name
            let data = this.event_logs_to_process[i].data
            
            if (this.event_listeners.hasOwnProperty(name)){
                let event_list = this.event_listeners[name];
                for (let j=0; j<event_list.length; j++){
                    event_list[j](data)
                }
            }
        }

        this.event_logs_to_process = []
    }

    on_event(name, callback){
        if (!this.event_listeners.hasOwnProperty(name)){
            this.event_listeners[name] = []
        }
        this.event_listeners[name].push(callback)
    }
}