const process = require('process')
const path = require('path')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const PROTO_PATH = path.join(__dirname, '../protos/foobar.proto')

const args = process.argv.slice(1)

const max = args[1] || Infinity
const timeMS = args[2] || 2000

console.log('server timeMS', timeMS)
console.log('server max', max)

const packageDefinition = protoLoader.loadSync(
  PROTO_PATH,
  {
    keepCase: true,
    longs: String,
    enums: String,
    defaults: true,
    oneofs: true,
  })

const foobarProto = grpc.loadPackageDefinition(packageDefinition).foobar

function getMessage(call, cb) {
  const prefix = '== SERVER: req-res =='
  console.log(prefix, 'Send. ')
  cb(null, { message: `Foo Bar ${call.request.message} !!`})
}

function getMessageInterval(call, cb) {
  let i = 0
  const prefix = '== SERVER: server-stream =='

  const intId = setInterval(() => {
    if (i > max) {
      clearInterval(intId)
      call.end()
      return
    }

    console.log(prefix, 'Send: => ', i)
    call.write({ message: `[${i++}] Foo Bar ${call.request.message} !!` })
  }, timeMS);
}

function getMessageConcat(call, cb) {
  const prefix = '== SERVER: client-stream =='
  let message = 'Foo Bar'

  call.on('error', (error) => {
    console.log(prefix, 'Error: => ', error)
  })

  call.on('data', (data) => {
    console.log(prefix, 'data: => ', data)
    message += ` ${data.message}`
  })

  call.on('end', () => {
    console.log(prefix, 'End.')
    cb(null, { message })
  })
}

function getMessageTwoWay(call, cb) {
  const prefix = '== SERVER: bi-stream =='
  call.on('error', (error) => {
    console.log(prefix, 'Error: => ', error)
  })

  call.on('data', (data) => {
    setTimeout(() => {
      console.log(prefix, 'data: => ', data)
      call.write({ message: `Foo Bar ${Math.random()} !!` })
    }, timeMS)
  })

  call.on('end', () => {
    console.log(prefix, 'End.')
    call.end()
  })
}

function main() {
  var server = new grpc.Server()
  server.addService(foobarProto.FooBar.service, {
    getMessage,
    getMessageInterval,
    getMessageConcat,
    getMessageTwoWay,
  })
  server.bind('0.0.0.0:50051', grpc.ServerCredentials.createInsecure())
  server.start()
}

main()
