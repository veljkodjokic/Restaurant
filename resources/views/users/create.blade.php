@extends('layouts.app', ['title' => __('User Management')])

@section('content')
    @include('users.partials.header', ['title' => __('Add User')])   

    <div class="container-fluid mt--7">
        <div class="row">
            <div class="col-xl-12 order-xl-1">
                <div class="card bg-secondary shadow">
                    <div class="card-header bg-white border-0">
                        <div class="row align-items-center">
                            <div class="col-8">
                                <h3 class="mb-0">{{ __('User Management') }}</h3>
                            </div>
                            <div class="col-4 text-right">
                                <a href="{{ route('user.index') }}" class="btn btn-sm btn-primary">{{ __('Back to list') }}</a>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <form method="post" action="{{ route('user.store') }}" autocomplete="off">
                            @csrf
                            
                            <h6 class="heading-small text-muted mb-4">{{ __('User information') }}</h6>
                            <div class="pl-lg-4">
                                <div class="form-group{{ $errors->has('name') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-name">{{ __('Name') }}</label>
                                    <input type="text" name="name" id="input-name" class="form-control form-control-alternative{{ $errors->has('name') ? ' is-invalid' : '' }}" placeholder="{{ __('Name') }}" value="{{ old('name') }}" required autofocus>

                                    @if ($errors->has('name'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('name') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('email') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-email">{{ __('Email') }}</label>
                                    <input type="email" name="email" id="input-email" class="form-control form-control-alternative{{ $errors->has('email') ? ' is-invalid' : '' }}" placeholder="{{ __('Email') }}" value="{{ old('email') }}" required>

                                    @if ($errors->has('email'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('email') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('birthday') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-birthday">{{ __('Birthday') }}</label>
                                    <input type="date" name="birthday" id="input-birthday" class="form-control form-control-alternative{{ $errors->has('birthday') ? ' is-invalid' : '' }}" placeholder="{{ __('Birthday') }}" value="{{ old('birthday') }}" required>

                                    @if ($errors->has('birthday'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('birthday') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('field') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-field">{{ __('Field of Expertise') }}</label>
                                    <input type="text" name="field" id="input-field" class="form-control form-control-alternative{{ $errors->has('field') ? ' is-invalid' : '' }}" placeholder="{{ __('Field of Expertise') }}" value="{{ old('field') }}" required>

                                    @if ($errors->has('field'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('field') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('address') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-address">{{ __('Address') }}</label>
                                    <input type="text" name="address" id="input-address" class="form-control form-control-alternative{{ $errors->has('address') ? ' is-invalid' : '' }}" placeholder="{{ __('Address') }}" value="{{ old('address') }}" required>

                                    @if ($errors->has('address'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('address') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('contact') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-contact">{{ __('Contact') }}</label>
                                    <input type="number" name="contact" id="input-contact" class="form-control form-control-alternative{{ $errors->has('contact') ? ' is-invalid' : '' }}" placeholder="{{ __('Contact') }}" value="{{ old('contact') }}" required>

                                    @if ($errors->has('contact'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('contact') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('password') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-password">{{ __('Password') }}</label>
                                    <input type="password" name="password" id="input-password" class="form-control form-control-alternative{{ $errors->has('password') ? ' is-invalid' : '' }}" placeholder="{{ __('Password') }}" value="" required>
                                    
                                    @if ($errors->has('password'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('password') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group">
                                    <label class="form-control-label" for="input-password-confirmation">{{ __('Confirm Password') }}</label>
                                    <input type="password" name="password_confirmation" id="input-password-confirmation" class="form-control form-control-alternative" placeholder="{{ __('Confirm Password') }}" value="" required>
                                </div>

                                <div class="form-group{{ $errors->has('admin') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-admin">{{ __('Admin') }}</label>
                                    <input type="hidden" name="admin" value="0">
                                    <input type="checkbox" name="admin" id="input-admin" class="form form-alternative" value="1" >

                                    @if ($errors->has('admin'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('admin') }}</strong>
                                        </span>
                                    @endif
                                </div>

                                <div class="text-center">
                                    <button type="submit" class="btn btn-success mt-4">{{ __('Save') }}</button>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
        </div>
        
        @include('layouts.footers.auth')
    </div>
@endsection