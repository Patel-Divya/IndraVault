Url for IPFS dashboard: https://developer.metamask.io/

Email: xi9q9jy0r6@mrotzis.com
Password: @Xxx12345

api key: b8d68d69c12642e7a79abd3682e9cd12
https: https://mainnet.infura.io/v3/b8d68d69c12642e7a79abd3682e9cd12


last video seen: 1:02:50

IPFS network setup remains





Pinata:

Email: convic.t.sdg@gmail.com
password: @Xxx1234567890

Dashboard: https://app.pinata.cloud/ipfs/files
API key: 9e9e5955fc9670776e81
API Secret: 8858c1587fa8f8029544e95e7ce7036e66f5812afe3cbeb100f51e86fad62ab2
JWT (Secret Access Token): eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySW5mb3JtYXRpb24iOnsiaWQiOiIzMWQyZWI2Ni1hZDQ4LTQ3ODYtYjM1Ni1hMDgwMzhlMmY3ODYiLCJlbWFpbCI6ImNvbnZpYy50LnNkZ0BnbWFpbC5jb20iLCJlbWFpbF92ZXJpZmllZCI6dHJ1ZSwicGluX3BvbGljeSI6eyJyZWdpb25zIjpbeyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJGUkExIn0seyJkZXNpcmVkUmVwbGljYXRpb25Db3VudCI6MSwiaWQiOiJOWUMxIn1dLCJ2ZXJzaW9uIjoxfSwibWZhX2VuYWJsZWQiOmZhbHNlLCJzdGF0dXMiOiJBQ1RJVkUifSwiYXV0aGVudGljYXRpb25UeXBlIjoic2NvcGVkS2V5Iiwic2NvcGVkS2V5S2V5IjoiOWU5ZTU5NTVmYzk2NzA3NzZlODEiLCJzY29wZWRLZXlTZWNyZXQiOiI4ODU4YzE1ODdmYThmODAyOTU0NGU5NWU3Y2U3MDM2ZTY2ZjU4MTJhZmUzY2JlYjEwMGY1MWU4NmZhZDYyYWIyIiwiZXhwIjoxODA0MDk2MTg0fQ.oh2NTIOaHATjpUf7H_quNvr9mEgdP0vOK2Xg7HsiJYI

setup simmilar in app.js eg.    :
import { create } from 'ipfs-http-client'

const projectId = 'YOUR_PINATA_API_KEY'
const projectSecret = 'YOUR_PINATA_API_SECRET'
const auth = 'Basic ' + Buffer.from(projectId + ':' + projectSecret).toString('base64')

const ipfs = create({
  host: 'api.pinata.cloud',
  port: 443,
  protocol: 'https',
  headers: { authorization: auth }
})