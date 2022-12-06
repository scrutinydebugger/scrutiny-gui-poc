import { JSDOM } from "jsdom"
const jsdom = new JSDOM("<!DOCTYPE html><html><body></body></html>")

export default require("jquery")(jsdom.window)
