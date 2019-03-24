#include "FPS_GT511C3.h"
#include "SoftwareSerial.h"

// software serial D4 (Arduino RX), D5 (Arduino TX)
FPS_GT511C3 fps(4, 5);

void setup() {
  Serial.begin(9600);   // initialize serial
  delay(100);
  fps.Open();           // initialize fingerprint sensor
  fps.SetLED(false);    //turn off fps LED

  Enroll();
}

void Enroll() {
  // find open enroll id
  int enrollid = 0;
  bool usedid = true;

  // checks whether id has fingerprint image stored
  // increment until empty id
  while (usedid == true){
    usedid = fps.CheckEnrolled(enrollid);
    if (usedid==true)
      enrollid++;
  }
  
  fps.EnrollStart(enrollid);                // start enrolling on enrollid
  fps.SetLED(true);                         // turn on LED so fps can see fingerprint
  Serial.print("Press finger to Enroll #");
  Serial.println(enrollid);
  
  while(fps.IsPressFinger() == false)       // continuously delay untill fps detect finger pressed
    delay(100);
  
  bool bret = fps.CaptureFinger(true);      // returns true/false if successfully capture fingerprint
  int iret = 0;
  
  if (bret != false){
    Serial.println("Remove finger");
    fps.Enroll1(); 
    
    while(fps.IsPressFinger() == true)
      delay(100);
    
    Serial.println("Press same finger again");
    
    while(fps.IsPressFinger() == false) 
      delay(100);
    
    bret = fps.CaptureFinger(true);       // capture fingerprint and return true/false
    
    if (bret != false){
      Serial.println("Remove finger");
      fps.Enroll2();
      
      while(fps.IsPressFinger() == true)
        delay(100);
      
      Serial.println("Press same finger yet again");
      
      while(fps.IsPressFinger() == false)
        delay(100);
      
      bret = fps.CaptureFinger(true);
      if (bret != false){
        Serial.println("Remove finger");
        iret = fps.Enroll3();
        if (iret == 0){
          Serial.println("Enrolling Successful");
          fps.SetLED(false);   //turn on LED so fps can see fingerprint
        }
        else{
          Serial.print("Enrolling Failed with error code:");
          Serial.println(iret);
        }
      }
      else Serial.println("Failed to capture third finger");
    }
    else Serial.println("Failed to capture second finger");
  }
  else Serial.println("Failed to capture first finger");
}

void checkID(){
  while(true){
    // Identify fingerprint test
    if (fps.IsPressFinger()){
      fps.CaptureFinger(false);
      int id = fps.Identify1_N();
      
         /*Note:  GT-521F52 can hold 3000 fingerprint templates
                  GT-521F32 can hold 200 fingerprint templates
                   GT-511C3 can hold 200 fingerprint templates. 
                  GT-511C1R can hold 20 fingerprint templates.
         Make sure to change the id depending on what
         model you are using */
      if (id < 200){  //<- change id value depending model you are using
        //if the fingerprint matches, provide the matching template ID
        Serial.print("Verified ID:");
        Serial.println(id);
      }
      else{ //if unable to recognize
        Serial.println("Finger not found");
      }
    }
    else{
      Serial.println("Please press finger");
    }
    delay(100);
  }
}

void loop() {
  // put your main code here, to run repeatedly:

}
