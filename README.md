# spinal-organ-api-enteliweb

## API Connector

The purpose of this organ is to connect enteliweb's api server with the BOS (Building Operating System) thus allowing device discovery , data extraction and device monitoring



## Getting started

### Requirements
Running this connector requires private information in a config.json5 file. Ask for permission to get access.
```
spinalConnector : {
    userId: "XXX", // user id - process.env.SPINAL_USER_ID
    name: "XXXXX",
    password : "XXXXX",
    protocol : "XXXX",
    host: "XXXXX", // can be an ip address - process.env.SPINALHUB_IP  
    port: "XXXX",
    path: "XXXXXXXXXXXXXX",
},
   
clientConnector : {
    rootPath: "XXXXXXXXXXXXXX,
    username: "XXXX",
    password: "XXXX"
}
```

This connector also requires the api version of the viewer plugin 'spinal-env-viewer-plugin-bacnet-manager'


To build the project, run 

```
npm run build
```

For development and during beta lifecycle of the project, run with
```
npm run start
```

Later on, you can add this organ in the .app.json file to run it with pm2 process manager

On the integration platform ( Studio ) you can create a network and try the features.
The data will be organized as follow :
- Graph
  - Network
    - NetworkVirtual
      - Device 1
        - Device 1 child_1 - groupendpoint
          - Device 1 child_2_1 - endpoint

        OR / AND

        - Device 1 child_2 - endpoint
      - ...







