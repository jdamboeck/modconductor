import struct, sys, json
from collections import defaultdict, Counter
d = open(sys.argv[1],'rb').read()
title = d[17:37].decode('latin1').rstrip('\0 ')
tracker = d[38:58].decode('latin1').rstrip('\0 ')
ver, hsize = struct.unpack_from('<HI', d, 58)
songlen, restart, nch, npat, nins, flags, speed, bpm = struct.unpack_from('<HHHHHHHH', d, 64)
order = list(d[80:80+songlen])
p = 60 + hsize
pats=[]
for i in range(npat):
    hl, pt, rows, psize = struct.unpack_from('<IBHH', d, p)
    data = d[p+hl:p+hl+psize]; p += hl + psize
    cells=[]; j=0
    while len(cells) < rows*nch and psize:
        b=data[j]; j+=1
        if b&0x80:
            v=[0]*5
            for k in range(5):
                if b&(1<<k): v[k]=data[j]; j+=1
        else:
            v=[b]+list(data[j:j+4]); j+=4
        cells.append(v)
    if not psize: cells=[[0]*5]*(rows*nch)
    pats.append([''.join('%02x%02x%02x%02x%02x'%tuple(cells[r*nch+c]) for c in range(nch)) for r in range(rows)])
insts=[]
for i in range(nins):
    isz = struct.unpack_from('<I', d, p)[0]
    name = d[p+4:p+26].decode('latin1').rstrip('\0 ')
    ns = struct.unpack_from('<H', d, p+27)[0]
    info={'n':i+1,'name':name}
    venv = struct.unpack_from('<24H', d, p+129); nvp=d[p+225]; vflags=d[p+233]
    fade = struct.unpack_from('<H', d, p+239)[0]
    info['env']=[[venv[k*2],venv[k*2+1]] for k in range(nvp)] if vflags&1 else []
    info['sus']=d[p+227] if vflags&2 else -1
    info['fade']=fade
    p+=isz
    hdr=[]
    for s in range(ns):
        ln,ls,ll=struct.unpack_from('<III',d,p)
        hdr.append(dict(len=ln,ls=ls,ll=ll,vol=d[p+12],fine=struct.unpack_from('<b',d,p+13)[0],typ=d[p+14],pan=d[p+15],rel=struct.unpack_from('<b',d,p+16)[0],sname=d[p+18:p+40].decode('latin1').rstrip('\0 ')))
        p+=40
    for s in hdr:
        raw=d[p:p+s['len']]; p+=s['len']; vals=[]; acc=0
        for b in raw:
            acc=(acc+(b if b<128 else b-256)+128)%256-128; vals.append(acc/128)
        n=len(vals)
        if n<=64: w=[round(x,2) for x in vals]
        else:
            step=n/64; w=[round(vals[int(k*step)],2) for k in range(64)]
            pk=[]
            for k in range(32):
                seg=vals[int(k*n/32):int((k+1)*n/32)]; pk.append(round(max(abs(x) for x in seg),2))
            s['peaks']=pk
        s['wave']=w; s['frames']=n
    if hdr:
        s=hdr[0]; info.update(frames=s['frames'],loop=s['typ']&3,vol=s['vol'],rel=s['rel'],fine=s['fine'],pan=s['pan'],sname=s['sname'],wave=s['wave'],peaks=s.get('peaks',[]))
    insts.append(info)
# usage per instrument per channel
use=defaultdict(Counter)
for pi in order:
    for row in pats[pi]:
        for c in range(nch):
            cell=row[c*10:c*10+10]; n=int(cell[0:2],16); ins=int(cell[2:4],16)
            if 0<n<97 and ins: use[ins][c+1]+=1
for ins in insts:
    u=use[ins['n']]; ins['hits']=sum(u.values()); ins['chans']=sorted(u)
json.dump(dict(title=title,author='dubmood',tracker=tracker,flags=flags,speed=speed,bpm=bpm,nch=nch,order=order,restart=restart,pats=pats,inst=insts),open(sys.argv[2],'w'),separators=(',',':'))
for ins in insts: print(ins['n'],ins['name'],ins['frames'],ins['loop'],ins['hits'],ins['chans'],ins['wave'][:16],ins['fade'],ins['sus'])
