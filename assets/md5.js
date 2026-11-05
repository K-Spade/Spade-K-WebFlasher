// MD5 for esptool-js write/read-back verification.
export function md5(binary) {
  const size = binary.length;
  const bytes = new Uint8Array(Math.ceil((size + 9) / 64) * 64);
  for (let i = 0; i < size; i++) bytes[i] = typeof binary === 'string' ? binary.charCodeAt(i) & 255 : binary[i];
  bytes[size] = 0x80;
  const view = new DataView(bytes.buffer);
  view.setUint32(bytes.length-8, size * 8 >>> 0, true);
  view.setUint32(bytes.length-4, Math.floor(size / 0x20000000), true);
  const shift = [7,12,17,22, 5,9,14,20, 4,11,16,23, 6,10,15,21];
  const constants = Array.from({ length:64 }, (_,i) => Math.floor(Math.abs(Math.sin(i+1))*0x100000000) | 0);
  let a0 = 0x67452301, b0 = 0xefcdab89 | 0, c0 = 0x98badcfe | 0, d0 = 0x10325476;
  for (let base = 0; base < bytes.length; base += 64) {
    let a=a0,b=b0,c=c0,d=d0;
    for (let i=0;i<64;i++) {
      let f,g,s;
      if (i<16) { f=(b&c)|(~b&d);g=i;s=shift[i%4]; }
      else if(i<32) { f=(d&b)|(~d&c);g=(5*i+1)%16;s=shift[4+i%4]; }
      else if(i<48) { f=b^c^d;g=(3*i+5)%16;s=shift[8+i%4]; }
      else { f=c^(b|~d);g=(7*i)%16;s=shift[12+i%4]; }
      const n=(a+f+constants[i]+view.getInt32(base+4*g,true))|0;
      const oldD=d;d=c;c=b;b=(b+((n<<s)|(n>>>(32-s))))|0;a=oldD;
    }
    a0=(a0+a)|0;b0=(b0+b)|0;c0=(c0+c)|0;d0=(d0+d)|0;
  }
  return [a0,b0,c0,d0].map(n=>[0,8,16,24].map(s=>((n>>>s)&255).toString(16).padStart(2,'0')).join('')).join('');
}
