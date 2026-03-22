"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs_1 = __importDefault(require("fs"));
const file = 'c:/Users/der_b/Desktop/F1App/recordings/session_7857360973421438752_2026-03-18T20-20-09-962Z.bin';
const buffer = Buffer.alloc(100);
const fd = fs_1.default.openSync(file, 'r');
fs_1.default.readSync(fd, buffer, 0, 100, 0);
fs_1.default.closeSync(fd);
console.log(buffer.toString('hex'));
