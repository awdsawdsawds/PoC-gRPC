const process = require('process')
const path = require('path')
const grpc = require('grpc')
const protoLoader = require('@grpc/proto-loader')

const PROTO_PATH = path.join(__dirname, '../protos/foobar.proto')

const args = process.argv.slice(1)

// console.log('client args', args)

const mode = args[1] || 1
const max = args[2] || Infinity
const timeMS = args[3] || 2000

console.log('client mode', mode)
console.log('client timeMS', timeMS)
console.log('client max', max)


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

const client = new foobarProto.FooBar('localhost:50051', grpc.credentials.createInsecure())


function testReqRes() {
  client.getMessage({ message: Math.random() }, (error, response) => {
    const prefix = '== CLIENT: req-res =='
    console.log(prefix, 'Error: => ', error)
    console.log(prefix, 'Response: => ', response)
  })
}

function testServerStream() {
  const prefix = '== CLIENT: server-stream =='
  const call = client.getMessageInterval({ message: Math.random() })

  call.on('error', (error) => {
    console.log(prefix, 'Error: => ', error)
  })

  call.on('data', (response) => {
    console.log(prefix, 'Response: => ', response)
  })

  call.on('end', () => {
    console.log(prefix, 'End.')
  })
}

function testClientStream() {
  const prefix = '== CLIENT: client-stream =='

  const call = client.getMessageConcat((error, response) => {
    console.log(prefix, 'Error: => ', error)
    console.log(prefix, 'Response: => ', response)
  })

  let i = 0
  const intId = setInterval(() => {
    if (i > max) {
      clearInterval(intId)
      call.end()
      return
    }

    console.log(prefix, 'Send: => ', i)
    call.write({ message: i++ })
  }, timeMS);
}

function testBiStream() {
  const prefix = '== CLIENT: bi-stream =='
  const call = client.getMessageTwoWay()
  let i = 0

  console.log(prefix, 'initial')
  call.write({ message: `Foo Bar ${Math.random()} !!` })
  i++

  call.on('error', (error) => {
    console.log(prefix, 'Error: => ', error)
  })

  call.on('data', (data) => {
    setTimeout(() => {
      console.log(prefix, `data[${i}]: => `, data)
      if (i > max) {
        call.end()
        return
      }
  
      call.write({ message: `Foo Bar ${Math.random()} !!` })
      i++
    }, timeMS)
  })

  call.on('end', () => {
    console.log(prefix, 'End.')
    call.end()
  })
}

switch (Number(mode)) {
  case 2:
    testServerStream()
    break
  case 3:
    testClientStream()
    break
  case 4:
    testBiStream()
    break
  case 1:
  default:
    testReqRes()
}
