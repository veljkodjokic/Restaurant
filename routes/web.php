<?php

/*
|--------------------------------------------------------------------------
| Web Routes
|--------------------------------------------------------------------------
|
| Here is where you can register web routes for your application. These
| routes are loaded by the RouteServiceProvider within a group which
| contains the "web" middleware group. Now create something great!
|
*/

// Authentication Routes...
Auth::routes();



//Auth users only
Route::group(['middleware' => 'auth'], function () {
	Route::resource('user', 'UserController', ['except' => ['show']]);
	Route::get('profile', ['as' => 'profile.edit', 'uses' => 'ProfileController@edit']);
	Route::put('profile', ['as' => 'profile.update', 'uses' => 'ProfileController@update']);
	Route::put('profile/password', ['as' => 'profile.password', 'uses' => 'ProfileController@password']);
    Route::get('activity', 'ProfileController@getActivity')->name('activity');

    Route::get('/', 'HomeController@index')->name('home');
    Route::get('/home', 'HomeController@index')->name('home');

    Route::get('/category/{name}','HomeController@getCategory');

    Route::post('/open-ticket', 'TicketController@openNew');
    Route::post('/save-ticket', 'TicketController@saveTicket');
    Route::post('/add-portion', 'TicketController@addPortion');

    Route::post('/search-category', 'HomeController@searchCategory');
    Route::post('/search-goods', 'HomeController@searchGoods');

    //Admin users only
    Route::middleware('admin')->group(function () {
        Route::resource('goods', 'GoodsController', ['except' => ['show']]);
    });
});