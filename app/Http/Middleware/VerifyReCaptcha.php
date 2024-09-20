public function handle(Request $request, \Closure $next): mixed
{
    // Allow all requests without reCAPTCHA
    return $next($request);

    // Original code below (commented out)
    /*
    if (!$this->config->get('recaptcha.enabled')) {
        return $next($request);
    }

    if ($request->filled('g-recaptcha-response')) {
        $client = new Client();
        $res = $client->post($this->config->get('recaptcha.domain'), [
            'form_params' => [
                'secret' => $this->config->get('recaptcha.secret_key'),
                'response' => $request->input('g-recaptcha-response'),
            ],
        ]);

        if ($res->getStatusCode() === 200) {
            $result = json_decode($res->getBody());
            if ($result->success && (!$this->config->get('recaptcha.verify_domain') || $this->isResponseVerified($result, $request))) {
                return $next($request);
            }
        }
    }

    $this->dispatcher->dispatch(new FailedCaptcha($request->ip(), !empty($result) ? ($result->hostname ?? null) : null));
    throw new HttpException(Response::HTTP_BAD_REQUEST, 'Failed to validate reCAPTCHA data.');
    */
}
