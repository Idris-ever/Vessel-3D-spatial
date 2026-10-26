// Conservative solid-envelope camera guard. Never hides or fades architecture.
export function cameraClear(q,plan,padding=.32){
 if(q[1]<padding)return false;
 for(const d of plan.platforms){
  if(q[1]<d.center[1]-d.thickness-padding||q[1]>d.center[1]+.32+padding)continue;
  const x=q[0]-d.center[0],z=q[2]-d.center[2],r=Math.cos(d.angle)*x+Math.sin(d.angle)*z,t=-Math.sin(d.angle)*x+Math.cos(d.angle)*z;
  if(Math.abs(r)<d.radialSize/2+padding&&Math.abs(t)<d.tangentSize/2+padding)return false;
 }
 for(const f of plan.stairs){
  const dx=(f.end[0]-f.start[0])/f.run,dz=(f.end[2]-f.start[2])/f.run,x=q[0]-f.start[0],z=q[2]-f.start[2],along=x*dx+z*dz,across=-x*dz+z*dx;
  if(along< -padding||along>f.run+padding||Math.abs(across)>f.width/2+.1+padding)continue;
  const height=f.start[1]+Math.max(0,Math.min(1,along/f.run))*f.rise;
  if(q[1]>height-.54-padding&&q[1]<height+.40+padding)return false;
 }
 return true;
}
export function clearCameraMove(a,b,plan,padding=.32){
 const distance=Math.hypot(...b.map((x,i)=>x-a[i])),steps=Math.max(1,Math.ceil(distance/.2));
 for(let i=1;i<=steps;i++)if(!cameraClear(a.map((x,j)=>x+(b[j]-x)*i/steps),plan,padding))return false;
 return true;
}
