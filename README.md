#fake-rest-server

Fake-rest-server is a generic and non-intrusive tool used to mock any http server response. It has been designed to address issues when running tests against unstable or slow external servers. It is an extension to [yahoo/fake-server](https://github.com/yahoo/fake-server).

===========

### How it works

The idea is to create a webserver listening in a different port and make your tests bring it up and configure how it should behave against each different request. Server response can be configured by posting the parameters and desired response to the server, or through configuration files inside `./default_routes/`.

For every request, fake-server will try to match against the configured URIs and return the expected response.

### Advantages

- No need to instrument your code (as long as the external server endpoint is configurable :P)
- Generic enough to work with blackbox or whitebox tests.
- No database required
#### Requirement
> node >= 0.10.x

> npm >= 1.4.x

### Installation
`fake-rest-server` is available on [npm](https://www.npmjs.com/package/fake-rest-server)

```shell
$ [sudo] npm install fake-rest-server -g
$ fake-rest-server
```

or
```shell
$ git clone git@github.com:crazylab/fake-server.git
$ cd fake-server
$ npm install
$ npm start
```
The server will start at `http://localhost:3012`. To configure the fake-rest-server `PORT` and `DEFAULT_ROUTES_PATH`, see the [Server Configuration](#server-configuration) section.

### Command Line Options
Fake server can be started as a background process using the following command
```shell
$ fake-rest-server --start
```
To stop the server started using the above command run
```shell
$ fake-rest-server --stop
```
### Quickstart (two really basic scenarios)
Let's say you want `/test`  to always return "hello" and `/foo` to return a 404. 

##### Add Endpoint
All you have to do is `POST` to `http://localhost:3012/__add` the following data:

Configure `/test` by posting:
```json
{
  "route": "/test",
  "responseCode": 200,
  "responseBody": "hello"
}
```

one of the many ways to do this is using cURL:
```
curl http://localhost:3012/__add -X POST -H "Content-Type:application/json" -H "Accept:application/json"  -d '{"route":"/test","responseCode":200,"responseBody":"hello"}' 
```

now let's configure our `404` example by sending this to the server:
```json
{
  "route": "/foo",
  "responseCode": 404,
  "responseBody": "Not found" 
}
```

using cURL:
``` 
curl http://localhost:3012/__add -X POST -H "Content-Type:application/json" -H "Accept:application/json" -d '{"route":"/foo","responseCode":404,"responseBody":"Not found"}' 
```

now, in your browser you can see the results:
> http://localhost:3012/foo

> http://localhost:3012/test  

##### Remove Endpoint
It is always a good practice to remove the the configured endpoint in the "teardown" part of your test.

You can remove the previously added `404` example configuration by sending a `POST` request to `http://localhost:3012/__remove` with the same configuration json:
```json
 {
   "route": "/foo",
   "responseCode": 404,
   "responseBody": "Not found" 
 }
 ```
This will remove `/foo` endpoint. If there are multiple `foo` endpoint configured, it will remove the best matched endpoint only.

### What else can fake-server do?

Configuration is done by sending a `POST` request to `/__add` or by placing a JSON file containing configurations inside a "routes" object (see [example](#server-configuration) below for reference). Here are the supported features for this version:

##### Routes can be RegEx

This will match `http://localhost:3012/news/007` as well as `http://localhost:3012/news/1231293871293827`:
```json
{
  "route": "/news/[0-9]",
  "responseCode": 200,
  "responseBody": "whatever you want"
}
``` 

##### Fake-rest-server supports "POST" calls and uses payload for matching. RegExs are supported for payload matching, and paths can be used to specify inner properties of JSON payloads:

```json
{
  "route": "/news",
  "payload": {
    "id": "[\\d+]",
    "requests[1].user.login": "jdoe",
    "month" : "february"
  },
  "responseCode": 200,
  "responseBody": "yay! it matches"
}
```
The above configuration will match a `POST` request  to `http://localhost:3012/news` with a similar payload as follows:
```json
{
  "id" : 1,
  "requests" : [{}, { "user" : { "login" : "jdoe"}}],
  "month" : "february"
}
```
##### Support for query string matching. All query params are evaluated as a RegEx.
```json
{
  "route": "/news",
  "queryParams": {
    "id": "[\\d+]",
    "location": "Hawaii"
  },
  "responseCode": 200,
  "responseBody": "Regex matching rocks"
}
``` 

##### ... can also use the request Headers. So you can check if specific cookies are present, for instance
```json
{
  "route": "/secure",
  "requiredHeaders": {
    "X-Auth": "secret"
  },
  "responseCode": 200,
  "responseBody": "header is there"
}
```


##### Response can be a file. In this case, fake-server will respond with the output of that file.

The following configuration example will return the output of `./mock_data/sample.json`. The file path will be relative from where the server is running. *(notice the parameter is called `responseData` instead of `responseBody`)*
```json
{
  "route": "/",  
  "responseCode": 200,  
  "responseData": "./mock_data/sample.json"
}  
```

##### Same endpoint can have different responses.

This will return `200` in the first two requests to `/` and `403` on the third request.  

```json
{
  "route": "/",  
  "responseCode": 200,  
  "responseBody": "ok"
}  
```
<strong>Note</strong> that I will be adding an `at` parameter to configure the special behavior to the third request:  
```json
{
  "route": "/",  
  "responseCode": 403,  
  "responseBody": "Thou shall not pass!",  
  "at": 3
}  
```

##### Delay response

The following will delay server response by one second:  
```json
{
  "route": "/slow/.*",  
  "responseCode": 200,  
  "responseBody": "OK",  
  "delay": 1000
}  
```

##### Resetting server configuration

To avoid the need to restart fake-server in order to clear the configuration, we've implemented a special endpoint called `/__flush`. By sending a `DELETE` request to `http://localhost:3012/__flush`, you will erase all previously configured responses refreshing the default router configuration.

### Server Configuration
The server can be configured by putting a `fake-rest-server.conf` file in the directory where the server is running. Below is a sample configuration file.
```json
{
  "PORT": 3000,
  "DEFAULT_ROUTES_PATH": "./default_routes",
  "LOG_DIR": "./logs"
}
```
- `PORT` specifies the server port, in this case `3000`.
- `DEFAULT_ROUTES_PATH` the server will load all the `.json` files from this directory to pre-configure itself with the specified routes on server start.
Below is a sample `default_routes.json` file.
```json
{
  "routes":[
    {
        "route": "/test/one",
        "responseCode":200,
        "responseBody": "it works very very fine"
    },
    {
        "route": "/test/two",
        "responseCode":200,
        "responseData": "./mock_data/sample.json"
    },
    {
        "route": "/test/three",
        "requiredHeaders": {
            "Cookie": "username=.*"
        },
        "responseBody": "headers match :-)"
    }
  ]
}
```
Notice that it is same as any other configuration that we have previously seen. Just that this one is a array of such configuration.
- `LOG_DIR` specifies directory path where the server logs will be stored when it is started in background using `--start` option.


### Limitations
- There are three reserved endpoints: `POST` `/__add`, `DELETE` `/__remove` and `/__flush`. These cannot be used by your application. We are considering, any endpoint starting with `__` will be reserved and will be used for further extention of this tool.
- Does not supports `https` connections, yet.

### To-Do
- Add more unit tests and integration test
- Support for all types of request like `DELETE`, `PUT` etc.
- Expose API to take dump of current configuration for later reloading
