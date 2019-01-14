const path = require('path');

// Default koa middleware
module.exports = app => [

  // Add context.success and context.fail utilities
  function addContextUtilsMiddleware(context, next) {
    function success(body) {
      context.response.body = body;
    }

    function fail(error, status) {
      status = status || error.status || 500;
      context.response.status = status;
      context.response.body = {
        error: {
          statusCode: status,
          message: (status !== 500 && error.message) || 'Internal server error.',
        },
      };
    }

    context.success = success;
    context.fail = fail;

    return next();
  },

  // Catch errors and send them as responses
  async function errorMiddleware(context, next) {
    try {
      await next();
    } catch(error) {
      context.fail(error);
    }
  },

  // Log all requests
  async function loggerMiddleware(context, next) {
    try {
      await next();
      app.log(`${request.method} ${request.url} ${response.status}`);
    } catch(error) {
      const { request, response } = context;
      if(response.status >= 400) {
        app.logError(`${request.method} ${request.url} ${response.status} - ${response.message}`);
      } else {
      }
    }
  },

  // Add common security headers
  require('koa-helmet')(),

  // Parse JSON and form data
  require('koa-bodyparser')(),

  // Add CORS header
  app.options.cors && require('@koa/cors')(),

  // Serve static files
  app.options.public && require('koa-static')(
    path.isAbsolute(app.options.public) 
      ? app.options.public
      : path.resolve(app.root, app.options.public)
  ),

].filter(m => typeof m === 'function');
