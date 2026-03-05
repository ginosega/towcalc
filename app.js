
const trucks=[
{name:"2021 Ford F150 PowerBoost",payload:1391,maxTow:9650,maxTongue:1160}
];

const trailers=[
{name:"Lance 1995",dry:5273,dryTongue:559,gvwr:7000},
{name:"Brinkley I 265",dry:7012,dryTongue:650,gvwr:9600},
{name:"Lance 1985",dry:5259,dryTongue:642,gvwr:7000},
{name:"Apex Nano",dry:3495,dryTongue:370,gvwr:4700}
];

function init(){

const truckSel=document.getElementById("truckSelect");
const trailerSel=document.getElementById("trailerSelect");

trucks.forEach((t,i)=>{
const o=document.createElement("option");
o.value=i;
o.textContent=t.name;
truckSel.appendChild(o);
});

trailers.forEach((t,i)=>{
const o=document.createElement("option");
o.value=i;
o.textContent=t.name;
trailerSel.appendChild(o);
});

renderLists();
updateResults();

truckSel.onchange=updateResults;
trailerSel.onchange=updateResults;

}

function renderLists(){
document.getElementById("truckList").innerHTML=
trucks.map(t=>"<div>"+t.name+"</div>").join("");

document.getElementById("trailerList").innerHTML=
trailers.map(t=>"<div>"+t.name+"</div>").join("");
}

function updateResults(){

const truck=trucks[document.getElementById("truckSelect").value||0];
const trailer=trailers[document.getElementById("trailerSelect").value||0];

const tongueRatio=trailer.dryTongue/trailer.dry;
const estTongue=Math.round(trailer.dry*tongueRatio);

let msg="";
msg+="Truck payload: "+truck.payload+" lb<br>";
msg+="Estimated tongue: "+estTongue+" lb<br>";
msg+="Tow rating: "+truck.maxTow+" lb<br>";

document.getElementById("output").innerHTML=msg;

}

document.querySelectorAll(".tabs button").forEach(btn=>{
btn.onclick=()=>{
document.querySelectorAll(".panel").forEach(p=>p.classList.remove("active"));
document.getElementById(btn.dataset.tab).classList.add("active");
};
});

window.onload=init;
