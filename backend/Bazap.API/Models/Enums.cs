namespace Bazap.API.Models;

public enum EventType { Receiving, Inspection, Outgoing }
public enum EventStatus { Draft, Pending, InProgress, Completed, Archived }
public enum ItemInspectionStatus { Pending, Pass, Fail }
public enum InspectionDecision { Pass, Disabled }
public enum DisableReason 
{ 
    VisualDamage,      // נזק ויזואלי
    Scrap,             // גרוטאות
    Malfunction,       // תקלה/לא תקין
    MissingParts,      // חלקים חסרים
    Expired,           // פג תוקף
    Calibration,       // טעון כיול
    Other              // אחר
}
