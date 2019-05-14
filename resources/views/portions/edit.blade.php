@extends('layouts.app', ['title' => __('Portions Management')])

@section('content')
    @include('users.partials.header', ['title' => __('Edit Portion')])

    <div class="container-fluid mt--7">
        <div class="row">
            <div class="col-xl-12 order-xl-1">
                <div class="card bg-secondary shadow">
                    <div class="card-header bg-white border-0">
                        <div class="row align-items-center">
                            <div class="col-8">
                                <h3 class="mb-0">{{ __('Portions Information') }}</h3>
                            </div>
                            <div class="col-4 text-right">
                                <a href="/portions/show/{{ $portion->good->first()->id }}" class="btn btn-sm btn-primary">{{ __('Back to list') }}</a>
                            </div>
                        </div>
                    </div>
                    <div class="card-body">
                        <form method="post" action="{{ route('portions.update') }}" autocomplete="off">
                            @csrf
                            <input type="hidden" name="goods_id" value="{{ $portion->id }}">

                            <div class="pl-lg-4">
                                <div class="form-group{{ $errors->has('portion') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-name">{{ __('Portion') }}</label>
                                    <input type="text" name="portion" id="input-portion" class="form-control form-control-alternative{{ $errors->has('portion') ? ' is-invalid' : '' }}" placeholder="{{ __('Portion') }}" value="{{ old('portion', $portion->portion) }}" required autofocus>

                                    @if ($errors->has('portion'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('portion') }}</strong>
                                        </span>
                                    @endif
                                </div>
                                <div class="form-group{{ $errors->has('price') ? ' has-danger' : '' }}">
                                    <label class="form-control-label" for="input-price">{{ __('Price') }}</label>
                                    <input type="text" name="price" id="input-price" class="form-control form-control-alternative{{ $errors->has('price') ? ' is-invalid' : '' }}" placeholder="{{ __('Price') }}" value="{{ old('price', $portion->price) }}" required autofocus>

                                    @if ($errors->has('price'))
                                        <span class="invalid-feedback" role="alert">
                                            <strong>{{ $errors->first('price') }}</strong>
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