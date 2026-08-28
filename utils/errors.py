class AppError(Exception):
    def __init__(self, code, message, status=400):
        super().__init__(message)
        self.code=code
        self.message=message
        self.status=status

def payload(code,message): return {"success":False,"error":{"code":code,"message":message}}

def register_error_handlers(app):
    from flask import jsonify
    from werkzeug.exceptions import HTTPException,RequestEntityTooLarge
    @app.errorhandler(AppError)
    def app_error(err): return jsonify(payload(err.code,err.message)),err.status
    @app.errorhandler(RequestEntityTooLarge)
    def too_large(_): return jsonify(payload("FILE_TOO_LARGE","The upload exceeds the configured size limit.")),413
    @app.errorhandler(429)
    def rate_limited(_): return jsonify(payload("RATE_LIMITED","Too many requests. Please try again later.")),429
    @app.errorhandler(Exception)
    def unhandled(err):
        if isinstance(err,HTTPException): return jsonify(payload("HTTP_ERROR",str(err.description))),err.code
        app.logger.exception("Unhandled application error")
        return jsonify(payload("INTERNAL_ERROR","An unexpected error occurred.")),500
