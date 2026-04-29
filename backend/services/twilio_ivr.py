"""Twilio voice IVR helpers."""
import os
import logging
from typing import Optional

logger = logging.getLogger("nidhii.twilio")


def is_configured() -> bool:
    return bool(os.environ.get("TWILIO_ACCOUNT_SID") and os.environ.get("TWILIO_AUTH_TOKEN"))


def validate_signature(url: str, params: dict, signature: str) -> bool:
    """Verify a Twilio webhook signature. Returns True if validation is disabled."""
    if os.environ.get("TWILIO_VALIDATE_SIGNATURE", "true").lower() != "true":
        return True
    token = os.environ.get("TWILIO_AUTH_TOKEN")
    if not token:
        return True  # stub mode — accept
    try:
        from twilio.request_validator import RequestValidator
        validator = RequestValidator(token)
        return validator.validate(url, params, signature or "")
    except Exception as e:
        logger.warning("signature validation failed: %s", e)
        return False


def greeting_twiml(language: str = "en", action_url: str = "/api/twilio/gather") -> str:
    """Initial IVR menu TwiML."""
    from twilio.twiml.voice_response import VoiceResponse

    prompts = {
        "en": "Welcome to Nidhii. Press 1 for water leak. Press 2 for electricity issue. Press 3 for waste. Press 9 to record a complaint.",
        "hi": "Nidhii mein aapka swagat hai. Paani ki samasya ke liye 1 dabaayein. Bijli ke liye 2. Kachra ke liye 3. Shikayat record karne ke liye 9.",
    }
    prompt = prompts.get(language, prompts["en"])
    voice_lang = "hi-IN" if language == "hi" else "en-IN"

    vr = VoiceResponse()
    g = vr.gather(num_digits=1, action=action_url, method="POST", timeout=6, finish_on_key="#")
    g.say(prompt, voice="Polly.Aditi" if language == "hi" else "Polly.Raveena", language=voice_lang)
    vr.redirect(action_url)  # if no input, retry
    return str(vr)


def category_record_twiml(category_label: str, language: str, recording_callback: str) -> str:
    from twilio.twiml.voice_response import VoiceResponse
    voice_lang = "hi-IN" if language == "hi" else "en-IN"
    voice = "Polly.Aditi" if language == "hi" else "Polly.Raveena"
    msgs = {
        "en": f"You selected {category_label}. After the beep, please say your name, your address and the issue. Press hash when done.",
        "hi": f"Aapne {category_label} chuna hai. Beep ke baad apna naam, pata aur samasya bataayein. Khatam hone par hash dabayein.",
    }
    vr = VoiceResponse()
    vr.say(msgs.get(language, msgs["en"]), voice=voice, language=voice_lang)
    vr.record(
        action="/api/twilio/recording-done",
        method="POST",
        max_length=90,
        finish_on_key="#",
        recording_status_callback=recording_callback,
        recording_status_callback_method="POST",
        play_beep=True,
        timeout=8,
    )
    return str(vr)


def thank_you_twiml(language: str = "en") -> str:
    from twilio.twiml.voice_response import VoiceResponse
    voice_lang = "hi-IN" if language == "hi" else "en-IN"
    voice = "Polly.Aditi" if language == "hi" else "Polly.Raveena"
    msgs = {
        "en": "Thank you. Your report is being filed. Goodbye.",
        "hi": "Dhanyavaad. Aapki shikayat darj ho rahi hai. Namaste.",
    }
    vr = VoiceResponse()
    vr.say(msgs.get(language, msgs["en"]), voice=voice, language=voice_lang)
    vr.hangup()
    return str(vr)


CATEGORY_MAP = {
    "1": ("water", {"en": "Water leak", "hi": "Paani ki samasya"}),
    "2": ("energy", {"en": "Electricity issue", "hi": "Bijli ki samasya"}),
    "3": ("waste", {"en": "Garbage / waste", "hi": "Kachra"}),
    "9": ("other", {"en": "General complaint", "hi": "Aam shikayat"}),
}


def category_for(digit: str, language: str = "en"):
    if digit not in CATEGORY_MAP:
        return None, ""
    code, labels = CATEGORY_MAP[digit]
    return code, labels.get(language, labels["en"])
