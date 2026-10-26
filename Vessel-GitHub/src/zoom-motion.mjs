// Pixel-equivalent input and an exact critically damped spring in log-distance.
export function wheelPixels(delta,mode,height,pinch=false){
 return Math.max(-120,Math.min(120,delta*(mode===1?16:mode===2?height:1)*(pinch?2:1)));
}
export function zoomStep(position,velocity,target,dt,omega=18){
 const error=position-target,j=velocity+omega*error,e=Math.exp(-omega*dt);
 let next=target+(error+j*dt)*e,v=(velocity-omega*j*dt)*e;
 if((next-target)*(position-target)<0){next=target;v=0;}
 return [next,v];
}
